import pool from '../config/database';

export interface Promocion {
  id: number;
  nombre: string;
  descripcion?: string;
  cantidad_minima: number;
  descuento_porcentaje?: number;
  precio_especial?: number;
  activa: boolean;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  creado_en: Date;
}

export class PromocionModel {
  static async getAll(): Promise<Promocion[]> {
    const result = await pool.query(
      'SELECT * FROM promociones ORDER BY cantidad_minima ASC'
    );
    return result.rows;
  }

  static async getActivas(): Promise<Promocion[]> {
    const result = await pool.query(
      `SELECT * FROM promociones 
       WHERE activa = true 
       AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
       AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
       ORDER BY cantidad_minima DESC`
    );
    return result.rows;
  }

  static async getById(id: number): Promise<Promocion | null> {
    const result = await pool.query(
      'SELECT * FROM promociones WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(promocion: Omit<Promocion, 'id' | 'creado_en'>): Promise<Promocion> {
    const result = await pool.query(
      `INSERT INTO promociones (nombre, descripcion, cantidad_minima, descuento_porcentaje, precio_especial, activa, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        promocion.nombre,
        promocion.descripcion,
        promocion.cantidad_minima,
        promocion.descuento_porcentaje,
        promocion.precio_especial,
        promocion.activa,
        promocion.fecha_inicio,
        promocion.fecha_fin
      ]
    );
    return result.rows[0];
  }

  static async update(id: number, promocion: Partial<Omit<Promocion, 'id' | 'creado_en'>>): Promise<Promocion | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (promocion.nombre !== undefined) {
      fields.push(`nombre = $${paramCount++}`);
      values.push(promocion.nombre);
    }
    if (promocion.descripcion !== undefined) {
      fields.push(`descripcion = $${paramCount++}`);
      values.push(promocion.descripcion);
    }
    if (promocion.cantidad_minima !== undefined) {
      fields.push(`cantidad_minima = $${paramCount++}`);
      values.push(promocion.cantidad_minima);
    }
    if (promocion.descuento_porcentaje !== undefined) {
      fields.push(`descuento_porcentaje = $${paramCount++}`);
      values.push(promocion.descuento_porcentaje);
    }
    if (promocion.precio_especial !== undefined) {
      fields.push(`precio_especial = $${paramCount++}`);
      values.push(promocion.precio_especial);
    }
    if (promocion.activa !== undefined) {
      fields.push(`activa = $${paramCount++}`);
      values.push(promocion.activa);
    }
    if (promocion.fecha_inicio !== undefined) {
      fields.push(`fecha_inicio = $${paramCount++}`);
      values.push(promocion.fecha_inicio);
    }
    if (promocion.fecha_fin !== undefined) {
      fields.push(`fecha_fin = $${paramCount++}`);
      values.push(promocion.fecha_fin);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE promociones SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
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

  static async findMejorPromocion(cantidadGorditas: number): Promise<Promocion | null> {
    const result = await pool.query(
      `SELECT * FROM promociones 
       WHERE activa = true 
       AND cantidad_minima <= $1
       AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
       AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
       ORDER BY cantidad_minima DESC
       LIMIT 1`,
      [cantidadGorditas]
    );
    return result.rows[0] || null;
  }
}