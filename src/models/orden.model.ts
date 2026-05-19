import pool from '../config/database';
import { PromocionModel, ItemOrdenPool, RefrescoOrdenPool } from './promocion.model';

export interface Orden {
  id: number;
  numero_orden: string;
  total: number;
  estado: string;
  nombre_cliente?: string;
  notas?: string;
  creado_en: Date;
  completado_en?: Date;
}

export interface OrdenItem {
  id: number;
  orden_id: number;
  tipo_masa_id: number;
  guisado_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  creado_en: Date;
}

export interface OrdenItemExtra {
  id: number;
  orden_item_id: number;
  extra_id: number;
  cantidad: number;
  precio: number;
}

export interface OrdenRefresco {
  id: number;
  orden_id: number;
  refresco_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CrearOrdenDTO {
  notas?: string;
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
          g.nombre as guisado_nombre,
          g.precio as guisado_precio,
          tm.nombre as tipo_masa_nombre,
          tm.precio_extra as masa_precio_extra
        FROM orden_items oi
        JOIN guisados g ON oi.guisado_id = g.id
        JOIN tipos_masa tm ON oi.tipo_masa_id = tm.id
        WHERE oi.orden_id = $1`,
        [id]
      );

      for (const item of itemsResult.rows) {
        const extrasResult = await client.query(
          `SELECT
            oie.*,
            e.nombre as extra_nombre
          FROM orden_item_extras oie
          JOIN extras e ON oie.extra_id = e.id
          WHERE oie.orden_item_id = $1`,
          [item.id]
        );
        item.extras = extrasResult.rows;
      }

      const refrescosResult = await client.query(
        `SELECT
          ore.*,
          r.nombre as refresco_nombre,
          r.sabor,
          r.tamaño
        FROM orden_refrescos ore
        JOIN refrescos r ON ore.refresco_id = r.id
        WHERE ore.orden_id = $1`,
        [id]
      );

      return {
        ...orden,
        items: itemsResult.rows,
        refrescos: refrescosResult.rows
      };
    } finally {
      client.release();
    }
  }

  static async create(ordenData: CrearOrdenDTO): Promise<any> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Daily sequential order number — use CURRENT_DATE so it matches the DB timezone
      const countResult = await client.query(
        `SELECT COALESCE(MAX(CAST(numero_orden AS INTEGER)), 0) AS ultimo
         FROM ordenes WHERE DATE(creado_en) = CURRENT_DATE`
      );
      const numeroComanda = parseInt(countResult.rows[0].ultimo) + 1;

      const ordenResult = await client.query(
        `INSERT INTO ordenes (numero_orden, total, estado, notas)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [String(numeroComanda), 0, 'pendiente', ordenData.notas]
      );
      const orden = ordenResult.rows[0];

      let totalSinPromo = 0;
      const itemsPool: ItemOrdenPool[] = [];

      // Process gorditas
      for (const item of ordenData.items) {
        const guisadoResult = await client.query(
          'SELECT precio FROM guisados WHERE id = $1',
          [item.guisado_id]
        );
        const masaResult = await client.query(
          'SELECT nombre, precio_extra FROM tipos_masa WHERE id = $1',
          [item.tipo_masa_id]
        );

        const guisadoPrecio = parseFloat(guisadoResult.rows[0].precio);
        const masaNombre: string = masaResult.rows[0].nombre;
        const masaPrecioExtra = parseFloat(masaResult.rows[0].precio_extra);
        const precioUnitario = guisadoPrecio + masaPrecioExtra;
        let subtotalItem = precioUnitario * item.cantidad;

        const itemResult = await client.query(
          `INSERT INTO orden_items (orden_id, tipo_masa_id, guisado_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [orden.id, item.tipo_masa_id, item.guisado_id, item.cantidad, precioUnitario, subtotalItem]
        );
        const ordenItem = itemResult.rows[0];

        // Process extras for this item
        if (item.extras && item.extras.length > 0) {
          let extrasSubtotal = 0;
          for (const extra of item.extras) {
            const extraResult = await client.query(
              'SELECT precio FROM extras WHERE id = $1',
              [extra.extra_id]
            );
            const extraPrecioUnit = parseFloat(extraResult.rows[0].precio);
            const extraPrecioTotal = extraPrecioUnit * extra.cantidad * item.cantidad;

            await client.query(
              `INSERT INTO orden_item_extras (orden_item_id, extra_id, cantidad, precio)
               VALUES ($1, $2, $3, $4)`,
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

        // Add to pool for promo evaluation (extras not included since promos
        // are evaluated against the base gordita price, not extras)
        itemsPool.push({ masa_nombre: masaNombre, precio_unitario: precioUnitario, cantidad: item.cantidad });
      }

      // Process refrescos
      const refrescosPool: RefrescoOrdenPool[] = [];

      if (ordenData.refrescos && ordenData.refrescos.length > 0) {
        for (const refresco of ordenData.refrescos) {
          const refrescoResult = await client.query(
            'SELECT precio, tamaño FROM refrescos WHERE id = $1',
            [refresco.refresco_id]
          );
          const refrescoPrecio = parseFloat(refrescoResult.rows[0].precio);
          const refrescoTamaño: string = refrescoResult.rows[0].tamaño;
          const subtotalRefresco = refrescoPrecio * refresco.cantidad;

          await client.query(
            `INSERT INTO orden_refrescos (orden_id, refresco_id, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [orden.id, refresco.refresco_id, refresco.cantidad, refrescoPrecio, subtotalRefresco]
          );

          totalSinPromo += subtotalRefresco;
          refrescosPool.push({ tamaño: refrescoTamaño, precio_unitario: refrescoPrecio, cantidad: refresco.cantidad });
        }
      }

      // Evaluate and apply promotions
      const { descuentoTotal, promocionesAplicadas } = await PromocionModel.evaluarPromociones(
        itemsPool,
        refrescosPool
      );

      const total = Math.max(0, totalSinPromo - descuentoTotal);

      await client.query(
        'UPDATE ordenes SET total = $1 WHERE id = $2',
        [total, orden.id]
      );

      await client.query('COMMIT');

      const totalGorditas = ordenData.items.reduce((sum, i) => sum + i.cantidad, 0);

      return {
        id: orden.id,
        numero_orden: String(numeroComanda),
        total,
        total_sin_promo: totalSinPromo,
        descuento: descuentoTotal,
        total_gorditas: totalGorditas,
        promociones_aplicadas: promocionesAplicadas,
        estado: 'pendiente',
        creado_en: orden.creado_en
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateEstado(id: number, estado: string): Promise<Orden | null> {
    const completadoEn = estado === 'completado' ? new Date() : null;
    const result = await pool.query(
      `UPDATE ordenes
       SET estado = $1, completado_en = $2
       WHERE id = $3
       RETURNING *`,
      [estado, completadoEn, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM ordenes WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async getResumenDia(): Promise<any> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_ordenes,
        COALESCE(SUM(total), 0) as ventas_total,
        SUM(CASE WHEN estado = 'pendiente'  THEN 1 ELSE 0 END) as ordenes_pendientes,
        SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as ordenes_completadas
       FROM ordenes
       WHERE DATE(creado_en) = CURRENT_DATE`
    );
    return result.rows[0];
  }

  static async getOrdenesDia(): Promise<Orden[]> {
    const result = await pool.query(
      `SELECT * FROM ordenes
       WHERE DATE(creado_en) = CURRENT_DATE
       ORDER BY creado_en DESC`
    );
    return result.rows;
  }
}
