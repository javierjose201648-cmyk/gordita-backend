import pool from '../config/database';

export interface Promocion {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_fijo?: number;
  activa: boolean;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  creado_en: Date;
}

export interface PromocionCondicion {
  id: number;
  promocion_id: number;
  tipo: 'gorditas_minimas' | 'gorditas_masa' | 'refresco_tamaño';
  cantidad: number;
  tipo_masa_nombre?: string;
  tamaño_refresco?: string;
}

export interface PromocionConCondiciones extends Promocion {
  condiciones: PromocionCondicion[];
}

export interface ItemOrdenPool {
  masa_nombre: string;
  precio_unitario: number;
  cantidad: number;
}

export interface RefrescoOrdenPool {
  tamaño: string;
  precio_unitario: number;
  cantidad: number;
}

export interface ResultadoPromocion {
  promocion_id: number;
  nombre: string;
  veces_aplicada: number;
  descuento: number;
}

export class PromocionModel {
  static async getAll(): Promise<Promocion[]> {
    const result = await pool.query(
      'SELECT * FROM promociones ORDER BY creado_en ASC'
    );
    return result.rows;
  }

  static async getActivas(): Promise<PromocionConCondiciones[]> {
    const result = await pool.query(
      `SELECT * FROM promociones
       WHERE activa = true
       AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
       AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
       ORDER BY precio_fijo ASC`
    );

    const promociones: PromocionConCondiciones[] = [];
    for (const promo of result.rows) {
      const condResult = await pool.query(
        'SELECT * FROM promocion_condiciones WHERE promocion_id = $1 ORDER BY id ASC',
        [promo.id]
      );
      promociones.push({ ...promo, condiciones: condResult.rows });
    }
    return promociones;
  }

  static async getById(id: number): Promise<PromocionConCondiciones | null> {
    const result = await pool.query(
      'SELECT * FROM promociones WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;

    const condResult = await pool.query(
      'SELECT * FROM promocion_condiciones WHERE promocion_id = $1 ORDER BY id ASC',
      [id]
    );
    return { ...result.rows[0], condiciones: condResult.rows };
  }

  static async create(data: {
    nombre: string;
    descripcion?: string;
    precio_fijo: number;
    activa?: boolean;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    condiciones?: Omit<PromocionCondicion, 'id' | 'promocion_id'>[];
  }): Promise<PromocionConCondiciones> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO promociones (nombre, descripcion, precio_fijo, activa, fecha_inicio, fecha_fin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.nombre, data.descripcion, data.precio_fijo, data.activa ?? true, data.fecha_inicio, data.fecha_fin]
      );
      const promo = result.rows[0];

      const condiciones: PromocionCondicion[] = [];
      for (const cond of data.condiciones ?? []) {
        const condResult = await client.query(
          `INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre, tamaño_refresco)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [promo.id, cond.tipo, cond.cantidad, cond.tipo_masa_nombre ?? null, cond.tamaño_refresco ?? null]
        );
        condiciones.push(condResult.rows[0]);
      }

      await client.query('COMMIT');
      return { ...promo, condiciones };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id: number, data: Partial<Omit<Promocion, 'id' | 'creado_en'>>): Promise<Promocion | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.nombre !== undefined)       { fields.push(`nombre = $${i++}`);       values.push(data.nombre); }
    if (data.descripcion !== undefined)  { fields.push(`descripcion = $${i++}`);  values.push(data.descripcion); }
    if (data.precio_fijo !== undefined)  { fields.push(`precio_fijo = $${i++}`);  values.push(data.precio_fijo); }
    if (data.activa !== undefined)       { fields.push(`activa = $${i++}`);       values.push(data.activa); }
    if (data.fecha_inicio !== undefined) { fields.push(`fecha_inicio = $${i++}`); values.push(data.fecha_inicio); }
    if (data.fecha_fin !== undefined)    { fields.push(`fecha_fin = $${i++}`);    values.push(data.fecha_fin); }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE promociones SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM promociones WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Evalúa todas las promociones activas contra los items de una orden.
   * Retorna los descuentos a aplicar y las promociones que aplican.
   *
   * Lógica por condición:
   *   gorditas_minimas  → necesita N gorditas en total
   *   gorditas_masa     → necesita N gorditas del tipo_masa_nombre indicado
   *   refresco_tamaño   → necesita N refrescos del tamaño indicado
   *
   * Cada promoción puede aplicarse múltiples veces si hay suficientes items.
   * El descuento por aplicación = (precio regular de items cubiertos) - precio_fijo.
   */
  static async evaluarPromociones(
    items: ItemOrdenPool[],
    refrescos: RefrescoOrdenPool[]
  ): Promise<{ descuentoTotal: number; promocionesAplicadas: ResultadoPromocion[] }> {
    const promosActivas = await PromocionModel.getActivas();
    const promocionesAplicadas: ResultadoPromocion[] = [];
    let descuentoTotal = 0;

    for (const promo of promosActivas) {
      if (!promo.precio_fijo || promo.condiciones.length === 0) continue;

      const { vecesAplicada, descuento } = PromocionModel._calcularAplicacion(
        promo,
        items,
        refrescos
      );

      if (vecesAplicada > 0 && descuento > 0) {
        promocionesAplicadas.push({
          promocion_id: promo.id,
          nombre: promo.nombre,
          veces_aplicada: vecesAplicada,
          descuento
        });
        descuentoTotal += descuento;
      }
    }

    return { descuentoTotal, promocionesAplicadas };
  }

  private static _calcularAplicacion(
    promo: PromocionConCondiciones,
    items: ItemOrdenPool[],
    refrescos: RefrescoOrdenPool[]
  ): { vecesAplicada: number; descuento: number } {
    let vecesAplicada = Infinity;

    // How many times can each condition be satisfied?
    for (const cond of promo.condiciones) {
      let disponible = 0;

      if (cond.tipo === 'gorditas_minimas') {
        disponible = items.reduce((sum, i) => sum + i.cantidad, 0);
      } else if (cond.tipo === 'gorditas_masa') {
        disponible = items
          .filter(i => i.masa_nombre === cond.tipo_masa_nombre)
          .reduce((sum, i) => sum + i.cantidad, 0);
      } else if (cond.tipo === 'refresco_tamaño') {
        disponible = refrescos
          .filter(r => r.tamaño === cond.tamaño_refresco)
          .reduce((sum, r) => sum + r.cantidad, 0);
      }

      vecesAplicada = Math.min(vecesAplicada, Math.floor(disponible / cond.cantidad));
    }

    if (vecesAplicada === Infinity || vecesAplicada === 0) {
      return { vecesAplicada: 0, descuento: 0 };
    }

    // Calculate regular price of covered items (cheapest first = conservative estimate)
    let precioRegularTotal = 0;

    for (const cond of promo.condiciones) {
      const necesitados = cond.cantidad * vecesAplicada;

      if (cond.tipo === 'gorditas_minimas') {
        precioRegularTotal += PromocionModel._sumarMasBaratos(
          items.map(i => ({ precio: i.precio_unitario, cantidad: i.cantidad })),
          necesitados
        );
      } else if (cond.tipo === 'gorditas_masa') {
        const filtrados = items
          .filter(i => i.masa_nombre === cond.tipo_masa_nombre)
          .map(i => ({ precio: i.precio_unitario, cantidad: i.cantidad }));
        precioRegularTotal += PromocionModel._sumarMasBaratos(filtrados, necesitados);
      } else if (cond.tipo === 'refresco_tamaño') {
        const filtrados = refrescos
          .filter(r => r.tamaño === cond.tamaño_refresco)
          .map(r => ({ precio: r.precio_unitario, cantidad: r.cantidad }));
        precioRegularTotal += PromocionModel._sumarMasBaratos(filtrados, necesitados);
      }
    }

    const precioFijo = parseFloat(promo.precio_fijo!.toString()) * vecesAplicada;
    const descuento = Math.max(0, precioRegularTotal - precioFijo);

    return { vecesAplicada, descuento };
  }

  // Takes cheapest N units from a pool, returns total price
  private static _sumarMasBaratos(
    pool: { precio: number; cantidad: number }[],
    necesitados: number
  ): number {
    const sorted = [...pool].sort((a, b) => a.precio - b.precio);
    let total = 0;
    let remaining = necesitados;

    for (const item of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(item.cantidad, remaining);
      total += take * item.precio;
      remaining -= take;
    }

    return total;
  }
}
