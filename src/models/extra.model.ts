import pool from '../config/database';

export interface Extra {
  id: number;
  nombre: string;
  precio: number;
  disponible: boolean;
  creado_en: Date;
}

export class ExtraModel {
  static async getAll(): Promise<Extra[]> {
    const result = await pool.query(
      'SELECT * FROM extras ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getAvailable(): Promise<Extra[]> {
    const result = await pool.query(
      'SELECT * FROM extras WHERE disponible = true ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<Extra | null> {
    const result = await pool.query(
      'SELECT * FROM extras WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(extra: Omit<Extra, 'id' | 'creado_en'>): Promise<Extra> {
    const result = await pool.query(
      `INSERT INTO extras (nombre, precio, disponible) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [extra.nombre, extra.precio, extra.disponible]
    );
    return result.rows[0];
  }

  static async update(id: number, extra: Partial<Omit<Extra, 'id' | 'creado_en'>>): Promise<Extra | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (extra.nombre !== undefined) {
      fields.push(`nombre = $${paramCount++}`);
      values.push(extra.nombre);
    }
    if (extra.precio !== undefined) {
      fields.push(`precio = $${paramCount++}`);
      values.push(extra.precio);
    }
    if (extra.disponible !== undefined) {
      fields.push(`disponible = $${paramCount++}`);
      values.push(extra.disponible);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE extras SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM extras WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}