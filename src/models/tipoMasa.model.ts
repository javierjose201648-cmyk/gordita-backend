import pool from '../config/database';

export interface TipoMasa {
  id: number;
  nombre: string;
  precio_extra: number;
  disponible: boolean;
  creado_en: Date;
}

export class TipoMasaModel {
  static async getAll(): Promise<TipoMasa[]> {
    const result = await pool.query(
      'SELECT * FROM tipos_masa ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getAvailable(): Promise<TipoMasa[]> {
    const result = await pool.query(
      'SELECT * FROM tipos_masa WHERE disponible = true ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<TipoMasa | null> {
    const result = await pool.query(
      'SELECT * FROM tipos_masa WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(tipoMasa: Omit<TipoMasa, 'id' | 'creado_en'>): Promise<TipoMasa> {
    const result = await pool.query(
      `INSERT INTO tipos_masa (nombre, precio_extra, disponible) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [tipoMasa.nombre, tipoMasa.precio_extra, tipoMasa.disponible]
    );
    return result.rows[0];
  }

  static async update(id: number, tipoMasa: Partial<Omit<TipoMasa, 'id' | 'creado_en'>>): Promise<TipoMasa | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (tipoMasa.nombre !== undefined) {
      fields.push(`nombre = $${paramCount++}`);
      values.push(tipoMasa.nombre);
    }
    if (tipoMasa.precio_extra !== undefined) {
      fields.push(`precio_extra = $${paramCount++}`);
      values.push(tipoMasa.precio_extra);
    }
    if (tipoMasa.disponible !== undefined) {
      fields.push(`disponible = $${paramCount++}`);
      values.push(tipoMasa.disponible);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE tipos_masa SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM tipos_masa WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}