import pool from '../config/database';

export interface CategoriaRefresco {
  id: number;
  nombre: string;
  creado_en: Date;
}

export class CategoriaRefrescoModel {
  static async getAll(): Promise<CategoriaRefresco[]> {
    const result = await pool.query(
      'SELECT * FROM categorias_refresco ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async create(nombre: string): Promise<CategoriaRefresco> {
    const result = await pool.query(
      'INSERT INTO categorias_refresco (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );
    return result.rows[0];
  }

  static async update(id: number, nombre: string): Promise<CategoriaRefresco | null> {
    const result = await pool.query(
      'UPDATE categorias_refresco SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre.trim(), id]
    );
    return result.rows[0] || null;
  }

  /** Deleting a category cascades to all refrescos that belong to it. */
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM categorias_refresco WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
