import pool from '../config/database';

export interface Guisado {
  id: number;
  nombre: string;
  precio: number;
  disponible: boolean;
  descripcion?: string;
  creado_en: Date;
}

export class GuisadoModel {
  static async getAll(): Promise<Guisado[]> {
    const result = await pool.query(
      'SELECT * FROM guisados ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getAvailable(): Promise<Guisado[]> {
    const result = await pool.query(
      'SELECT * FROM guisados WHERE disponible = true ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<Guisado | null> {
    const result = await pool.query(
      'SELECT * FROM guisados WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(guisado: Omit<Guisado, 'id' | 'creado_en'>): Promise<Guisado> {
    const result = await pool.query(
      `INSERT INTO guisados (nombre, precio, disponible, descripcion) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [guisado.nombre, guisado.precio, guisado.disponible, guisado.descripcion]
    );
    return result.rows[0];
  }

  static async update(id: number, guisado: Partial<Omit<Guisado, 'id' | 'creado_en'>>): Promise<Guisado | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (guisado.nombre !== undefined) {
      fields.push(`nombre = $${paramCount++}`);
      values.push(guisado.nombre);
    }
    if (guisado.precio !== undefined) {
      fields.push(`precio = $${paramCount++}`);
      values.push(guisado.precio);
    }
    if (guisado.disponible !== undefined) {
      fields.push(`disponible = $${paramCount++}`);
      values.push(guisado.disponible);
    }
    if (guisado.descripcion !== undefined) {
      fields.push(`descripcion = $${paramCount++}`);
      values.push(guisado.descripcion);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE guisados SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM guisados WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}