import pool from '../config/database';
import { PromocionModel, ItemOrdenPool, RefrescoOrdenPool } from './promocion.model';
import { RefriModel } from './refri.model';
import { TurnoModel } from './turno.model';

export interface Orden {
  id: number;
  numero_orden: string;
  total: number;
  estado: string;
  notas?: string;
  creado_en: Date;
  completado_en?: Date;
}

export interface CrearOrdenDTO {
  notas?: string;
  metodo_pago?: 'efectivo' | 'tarjeta';  // método de pago — default: efectivo
  promocion_id?: number;   // si viene → orden de promo, se valida y aplica precio_fijo
  items: {
    tipo_masa_id: number;
    guisado_id: number;
    cantidad: number;
    extras?: { extra_id: number; cantidad: number }[];
  }[];
  refrescos?: {
    refresco_id: number;
    cantidad: number;
  }[];
}

/** Error de validación de condiciones de promo — el controller lo devuelve como 400 */
export class PromoCondicionError extends Error {
  readonly errores: string[];
  constructor(errores: string[]) {
    super(`Condiciones de promoción no cumplidas: ${errores.join(' | ')}`);
    this.name = 'PromoCondicionError';
    this.errores = errores;
  }
}

export class OrdenModel {
  static async getAll(): Promise<Orden[]> {
    const result = await pool.query(
      'SELECT * FROM ordenes ORDER BY creado_en DESC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<any | null> {
    const client = await pool.connect();
    try {
      const ordenResult = await client.query(
        'SELECT * FROM ordenes WHERE id = $1',
        [id]
      );
      if (ordenResult.rows.length === 0) return null;

      const orden = ordenResult.rows[0];

      const itemsResult = await client.query(
        `SELECT
          oi.*,
          COALESCE(g.nombre, '[guisado eliminado]')   AS guisado_nombre,
          g.precio                                     AS guisado_precio,
          COALESCE(tm.nombre, '[masa eliminada]')      AS tipo_masa_nombre,
          tm.precio                                    AS masa_precio_extra
        FROM orden_items oi
        LEFT JOIN guisados g    ON oi.guisado_id    = g.id
        LEFT JOIN tipos_masa tm ON oi.tipo_masa_id  = tm.id
        WHERE oi.orden_id = $1`,
        [id]
      );

      // Batch query: un solo round-trip para todos los extras en lugar de un query por item
      const itemIds: number[] = itemsResult.rows.map((r: any) => r.id as number);
      if (itemIds.length > 0) {
        const extrasResult = await client.query(
          `SELECT oie.*, e.nombre AS extra_nombre
           FROM orden_item_extras oie
           JOIN extras e ON oie.extra_id = e.id
           WHERE oie.orden_item_id = ANY($1::int[])`,
          [itemIds]
        );
        const extrasByItem = new Map<number, any[]>();
        for (const extra of extrasResult.rows) {
          const arr = extrasByItem.get(extra.orden_item_id) ?? [];
          arr.push(extra);
          extrasByItem.set(extra.orden_item_id, arr);
        }
        for (const item of itemsResult.rows) {
          item.extras = extrasByItem.get(item.id) ?? [];
        }
      } else {
        for (const item of itemsResult.rows) item.extras = [];
      }

      const refrescosResult = await client.query(
        `SELECT ore.*, r.nombre as refresco_nombre, r.sabor, r.tamaño
         FROM orden_refrescos ore
         JOIN refrescos r ON ore.refresco_id = r.id
         WHERE ore.orden_id = $1`,
        [id]
      );

      return { ...orden, items: itemsResult.rows, refrescos: refrescosResult.rows };
    } finally {
      client.release();
    }
  }

  static async create(ordenData: CrearOrdenDTO): Promise<any> {
    // Ensure a turno exists — first sale of the shift creates it
    const turno = await TurnoModel.getOrCrearActivo();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock por turno para evitar race condition en el número de orden.
      // Dos cajeros simultáneos en el mismo turno esperan el uno al otro
      // antes de calcular el MAX — sin esto podrían obtener el mismo número.
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [turno.id]);

      // Sequential order number resets with each turno (unique per turno_id)
      const countResult = await client.query(
        `SELECT COALESCE(MAX(CAST(numero_orden AS INTEGER)), 0) AS ultimo
         FROM ordenes WHERE turno_id = $1`,
        [turno.id]
      );
      const numeroComanda = parseInt(countResult.rows[0].ultimo) + 1;

      const metodo = ordenData.metodo_pago ?? 'efectivo';
      const ordenResult = await client.query(
        `INSERT INTO ordenes (numero_orden, turno_id, total, estado, notas, metodo_pago)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [String(numeroComanda), turno.id, 0, 'pendiente', ordenData.notas ?? null, metodo]
      );
      const orden = ordenResult.rows[0];

      let totalSinPromo = 0;
      const itemsPool: ItemOrdenPool[] = [];

      // ── Procesar gorditas ──
      for (const item of ordenData.items) {
        const [guisadoRes, masaRes] = await Promise.all([
          client.query('SELECT precio FROM guisados WHERE id = $1', [item.guisado_id]),
          client.query('SELECT nombre, precio FROM tipos_masa WHERE id = $1', [item.tipo_masa_id]),
        ]);

        const guisadoPrecio    = parseFloat(guisadoRes.rows[0].precio);
        const masaNombre       = masaRes.rows[0].nombre as string;
        const masaPrecioExtra  = parseFloat(masaRes.rows[0].precio);
        const precioUnitario   = guisadoPrecio + masaPrecioExtra;
        let subtotalItem       = precioUnitario * item.cantidad;

        const itemRes = await client.query(
          `INSERT INTO orden_items (orden_id, tipo_masa_id, guisado_id, cantidad, precio_unitario, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [orden.id, item.tipo_masa_id, item.guisado_id, item.cantidad, precioUnitario, subtotalItem]
        );
        const ordenItem = itemRes.rows[0];

        // Extras
        if (item.extras && item.extras.length > 0) {
          let extrasSubtotal = 0;
          for (const extra of item.extras) {
            const extraRes = await client.query(
              'SELECT precio FROM extras WHERE id = $1', [extra.extra_id]
            );
            const extraPrecioUnit  = parseFloat(extraRes.rows[0].precio);
            const extraPrecioTotal = extraPrecioUnit * extra.cantidad * item.cantidad;

            await client.query(
              `INSERT INTO orden_item_extras (orden_item_id, extra_id, cantidad, precio)
               VALUES ($1,$2,$3,$4)`,
              [ordenItem.id, extra.extra_id, extra.cantidad, extraPrecioUnit * extra.cantidad]
            );
            extrasSubtotal += extraPrecioTotal;
          }
          subtotalItem += extrasSubtotal;
          await client.query(
            'UPDATE orden_items SET subtotal = $1 WHERE id = $2',
            [subtotalItem, ordenItem.id]
          );
        }

        totalSinPromo += subtotalItem;
        itemsPool.push({ masa_nombre: masaNombre, precio_unitario: precioUnitario, cantidad: item.cantidad });
      }

      // ── Procesar refrescos ──
      const refrescosPool: RefrescoOrdenPool[] = [];

      for (const refresco of ordenData.refrescos ?? []) {
        const refRes = await client.query(
          'SELECT precio, tamaño FROM refrescos WHERE id = $1', [refresco.refresco_id]
        );
        const refrescoPrecio = parseFloat(refRes.rows[0].precio);
        const refrescoTamaño = refRes.rows[0].tamaño as string;
        const subtotalRef    = refrescoPrecio * refresco.cantidad;

        await client.query(
          `INSERT INTO orden_refrescos (orden_id, refresco_id, cantidad, precio_unitario, subtotal)
           VALUES ($1,$2,$3,$4,$5)`,
          [orden.id, refresco.refresco_id, refresco.cantidad, refrescoPrecio, subtotalRef]
        );

        totalSinPromo += subtotalRef;
        refrescosPool.push({ tamaño: refrescoTamaño, precio_unitario: refrescoPrecio, cantidad: refresco.cantidad });
      }

      // ── Descontar del inventario del refri por categoría ──
      if (ordenData.refrescos && ordenData.refrescos.length > 0) {
        await RefriModel.decreaseForSale(client, ordenData.refrescos);
      }

      // ── Aplicar promoción (solo si el cliente la pide explícitamente) ──
      let total         = totalSinPromo;
      let descuento     = 0;
      let promoAplicada = null;

      if (ordenData.promocion_id) {
        const promo = await PromocionModel.getById(ordenData.promocion_id);

        if (!promo || !promo.activa) {
          await client.query('ROLLBACK');
          throw new Error('La promoción indicada no existe o no está activa');
        }

        const errores = PromocionModel.validarCondiciones(promo, itemsPool, refrescosPool);
        if (errores.length > 0) {
          await client.query('ROLLBACK');
          throw new PromoCondicionError(errores);
        }

        const precioFijo = parseFloat(promo.precio_fijo!.toString());
        descuento     = Math.max(0, totalSinPromo - precioFijo);
        total         = precioFijo;
        promoAplicada = { id: promo.id, nombre: promo.nombre, precio_fijo: precioFijo };
      }

      await client.query('UPDATE ordenes SET total = $1 WHERE id = $2', [total, orden.id]);
      await client.query('COMMIT');

      return {
        id:              orden.id,
        numero_orden:    String(numeroComanda),
        total,
        total_sin_promo: totalSinPromo,
        descuento,
        total_gorditas:  ordenData.items.reduce((s, i) => s + i.cantidad, 0),
        promocion_aplicada: promoAplicada,
        estado:          'pendiente',
        creado_en:       orden.creado_en,
      };
    } catch (error) {
      // ROLLBACK only if not already rolled back (PromoCondicionError does it early)
      if (!(error instanceof PromoCondicionError) && !(error instanceof Error && error.message.includes('no existe'))) {
        try { await client.query('ROLLBACK'); } catch (_) { /* already rolled back */ }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateEstado(id: number, estado: string): Promise<Orden | null> {
    const completadoEn = estado === 'completado' ? new Date() : null;
    const result = await pool.query(
      `UPDATE ordenes SET estado = $1, completado_en = $2 WHERE id = $3 RETURNING *`,
      [estado, completadoEn, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Snapshot refrescos before cascade-delete, so we can restore refri inventory
      const refRes = await client.query(
        'SELECT refresco_id, cantidad FROM orden_refrescos WHERE orden_id = $1',
        [id]
      );

      const result = await client.query('DELETE FROM ordenes WHERE id = $1', [id]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return false; }

      // Restore refri inventory for every refresco that was in the order
      for (const r of refRes.rows) {
        const catRes = await client.query(
          'SELECT categoria_id FROM refrescos WHERE id = $1',
          [r.refresco_id]
        );
        const catId: number | null = catRes.rows[0]?.categoria_id ?? null;
        if (catId) {
          await client.query(
            `UPDATE refri_inventario
                SET cantidad = GREATEST(0, cantidad + $1), actualizado_en = NOW()
              WHERE categoria_id = $2`,
            [r.cantidad, catId]
          );
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) { /* already rolled back */ }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Replaces the items and refrescos of an existing order with new quantities.
   * Items with cantidad = 0 are deleted. Prices per unit are kept from the original
   * order (no re-query of the catalog). Refri inventory is adjusted for the delta
   * in refresco quantities (restores removed, deducts added).
   */
  static async replaceContenido(
    ordenId: number,
    updates: {
      items:     { id: number; cantidad: number }[];
      refrescos: { id: number; cantidad: number }[];
    }
  ): Promise<any | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ordenRes = await client.query('SELECT id FROM ordenes WHERE id = $1', [ordenId]);
      if (ordenRes.rows.length === 0) { await client.query('ROLLBACK'); return null; }

      // Snapshot current refresco quantities for refri delta calculation
      const oldRefRes = await client.query(
        'SELECT id, refresco_id, cantidad FROM orden_refrescos WHERE orden_id = $1',
        [ordenId]
      );
      const oldRefMap = new Map<number, { refresco_id: number; cantidad: number }>();
      for (const r of oldRefRes.rows) {
        oldRefMap.set(r.id, { refresco_id: r.refresco_id, cantidad: Number(r.cantidad) });
      }

      // Process gordita updates
      for (const item of updates.items) {
        if (item.cantidad <= 0) {
          await client.query(
            'DELETE FROM orden_items WHERE id = $1 AND orden_id = $2',
            [item.id, ordenId]
          );
        } else {
          const priceRes = await client.query(
            'SELECT precio_unitario FROM orden_items WHERE id = $1 AND orden_id = $2',
            [item.id, ordenId]
          );
          if (priceRes.rows.length > 0) {
            const precio = parseFloat(priceRes.rows[0].precio_unitario);
            await client.query(
              'UPDATE orden_items SET cantidad = $1, subtotal = $2 WHERE id = $3',
              [item.cantidad, precio * item.cantidad, item.id]
            );
          }
        }
      }

      // Process refresco updates + build new-quantity map for refri delta
      const newRefMap = new Map<number, number>(); // refresco_id → new total cantidad
      for (const ref of updates.refrescos) {
        if (ref.cantidad <= 0) {
          await client.query(
            'DELETE FROM orden_refrescos WHERE id = $1 AND orden_id = $2',
            [ref.id, ordenId]
          );
          // new cantidad = 0 (not added to newRefMap)
        } else {
          const rRes = await client.query(
            'SELECT refresco_id, precio_unitario FROM orden_refrescos WHERE id = $1 AND orden_id = $2',
            [ref.id, ordenId]
          );
          if (rRes.rows.length > 0) {
            const precio = parseFloat(rRes.rows[0].precio_unitario);
            const refrescoId: number = rRes.rows[0].refresco_id;
            await client.query(
              'UPDATE orden_refrescos SET cantidad = $1, subtotal = $2 WHERE id = $3',
              [ref.cantidad, precio * ref.cantidad, ref.id]
            );
            newRefMap.set(refrescoId, (newRefMap.get(refrescoId) ?? 0) + ref.cantidad);
          }
        }
      }

      // Recalculate total from DB state
      const totalRes = await client.query(`
        SELECT
          COALESCE((SELECT SUM(subtotal) FROM orden_items     WHERE orden_id = $1), 0) +
          COALESCE((SELECT SUM(subtotal) FROM orden_refrescos WHERE orden_id = $1), 0) AS total
      `, [ordenId]);
      const nuevoTotal = parseFloat(totalRes.rows[0].total);
      await client.query('UPDATE ordenes SET total = $1 WHERE id = $2', [nuevoTotal, ordenId]);

      // Adjust refri: restore what was removed, deduct what was added beyond original
      for (const [rowId, old] of oldRefMap) {
        const newCantidad = newRefMap.get(old.refresco_id) ?? 0;
        const delta = old.cantidad - newCantidad; // positive → restore to refri
        if (delta === 0) continue;
        const catRes = await client.query(
          'SELECT categoria_id FROM refrescos WHERE id = $1',
          [old.refresco_id]
        );
        const catId: number | null = catRes.rows[0]?.categoria_id ?? null;
        if (catId) {
          await client.query(
            `UPDATE refri_inventario
                SET cantidad = GREATEST(0, cantidad + $1), actualizado_en = NOW()
              WHERE categoria_id = $2`,
            [delta, catId]
          );
        }
      }

      await client.query('COMMIT');
      return await OrdenModel.getById(ordenId);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) { /* already rolled back */ }
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOrdenesDelTurno(): Promise<any[]> {
    const { TurnoModel } = await import('./turno.model');
    const turno = await TurnoModel.getActivo();
    if (!turno) return [];

    // CTE pre-agrupado: un solo pass sobre cada tabla en lugar de subqueries correlacionadas
    const result = await pool.query(`
      WITH gorditas_agg AS (
        SELECT
          oi.orden_id,
          json_agg(
            json_build_object(
              'guisado',  COALESCE(g.nombre, '[eliminado]'),
              'masa',     COALESCE(tm.nombre, '[eliminado]'),
              'cantidad', oi.cantidad
            ) ORDER BY oi.id
          ) AS gorditas
        FROM orden_items oi
        LEFT JOIN guisados   g  ON g.id  = oi.guisado_id
        LEFT JOIN tipos_masa tm ON tm.id = oi.tipo_masa_id
        GROUP BY oi.orden_id
      ),
      bebidas_agg AS (
        SELECT
          ore.orden_id,
          json_agg(
            json_build_object(
              'nombre',   r.nombre,
              'tamaño',   r.tamaño,
              'cantidad', ore.cantidad
            ) ORDER BY ore.id
          ) AS bebidas
        FROM orden_refrescos ore
        JOIN refrescos r ON r.id = ore.refresco_id
        GROUP BY ore.orden_id
      )
      SELECT
        o.id,
        o.numero_orden,
        o.total,
        o.creado_en,
        COALESCE(ga.gorditas, '[]') AS gorditas,
        COALESCE(ba.bebidas,  '[]') AS bebidas
      FROM ordenes o
      LEFT JOIN gorditas_agg ga ON ga.orden_id = o.id
      LEFT JOIN bebidas_agg  ba ON ba.orden_id = o.id
      WHERE o.turno_id = $1
      ORDER BY o.creado_en ASC
    `, [turno.id]);

    return result.rows;
  }

}
