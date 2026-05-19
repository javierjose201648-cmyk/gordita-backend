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
   * Valida si los items de una orden cumplen TODAS las condiciones de una promoción.
   * Retorna un array de mensajes de error; array vacío = condiciones cumplidas.
   *
   * Úsalo ANTES de crear la orden para dar feedback al usuario.
   */
  static validarCondiciones(
    promo: PromocionConCondiciones,
    items: ItemOrdenPool[],
    refrescos: RefrescoOrdenPool[]
  ): string[] {
    const errores: string[] = [];

    for (const cond of promo.condiciones) {
      if (cond.tipo === 'gorditas_minimas') {
        const total = items.reduce((s, i) => s + i.cantidad, 0);
        if (total < cond.cantidad) {
          errores.push(
            `Se necesitan al menos ${cond.cantidad} gorditas (tienes ${total})`
          );
        }
      } else if (cond.tipo === 'gorditas_masa') {
        const count = items
          .filter(i => i.masa_nombre === cond.tipo_masa_nombre)
          .reduce((s, i) => s + i.cantidad, 0);
        if (count < cond.cantidad) {
          errores.push(
            `Se necesitan ${cond.cantidad} gorditas de ${cond.tipo_masa_nombre} (tienes ${count})`
          );
        }
      } else if (cond.tipo === 'refresco_tamaño') {
        const count = refrescos
          .filter(r => r.tamaño === cond.tamaño_refresco)
          .reduce((s, r) => s + r.cantidad, 0);
        if (count < cond.cantidad) {
          errores.push(
            `Se necesita ${cond.cantidad} refresco de ${cond.tamaño_refresco} (tienes ${count})`
          );
        }
      }
    }

    return errores;
  }

}

