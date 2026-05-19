import pool from '../config/database';

export interface Refresco {
  id: number;
  nombre: string;
  sabor: string;
  tamaño: string;
  precio: number;
  disponible: boolean;
  creado_en: Date;
}

export class RefrescoModel {
  static async getAll(): Promise<Refresco[]> {
    const result = await pool.query(
      'SELECT * FROM refrescos ORDER BY nombre ASC, tamaño DESC'
    );
    return result.rows;
  }

  static async getAvailable(): Promise<Refresco[]> {
    const result = await pool.query(
      'SELECT * FROM refrescos WHERE disponible = true ORDER BY nombre ASC, tamaño DESC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<Refresco | null> {
    const result = await pool.query(
      'SELECT * FROM refrescos WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(refresco: Omit<Refresco, 'id' | 'creado_en'>): Promise<Refresco> {
    const result = await pool.query(
      `INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [refresco.nombre, refresco.sabor, refresco.tamaño, refresco.precio, refresco.disponible]
    );
    return result.rows[0];
  }

  static async update(id: number, refresco: Partial<Omit<Refresco, 'id' | 'creado_en'>>): Promise<Refresco | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (refresco.nombre !== undefined) {
      fields.push(`nombre = $${paramCount++}`);
      values.push(refresco.nombre);
    }
    if (refresco.sabor !== undefined) {
      fields.push(`sabor = $${paramCount++}`);
      values.push(refresco.sabor);
    }
    if (refresco.tamaño !== undefined) {
      fields.push(`tamaño = $${paramCount++}`);
      values.push(refresco.tamaño);
    }
    if (refresco.precio !== undefined) {
      fields.push(`precio = $${paramCount++}`);
      values.push(refresco.precio);
    }
    if (refresco.disponible !== undefined) {
      fields.push(`disponible = $${paramCount++}`);
      values.push(refresco.disponible);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE refrescos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM refrescos WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}