import pool from '../config/database';

export interface Refresco {
  id: number;
  nombre: string;
  sabor: string;
  tamaño: string;
  precio: number;
  disponible: boolean;
  categoria_id: number | null;
  categoria_nombre?: string;   // populated via JOIN
  creado_en: Date;
}

const SELECT_WITH_CAT = `
  SELECT r.*, c.nombre AS categoria_nombre
  FROM   refrescos r
  LEFT JOIN categorias_refresco c ON r.categoria_id = c.id
`;

export class RefrescoModel {
  static async getAll(): Promise<Refresco[]> {
    const result = await pool.query(
      `${SELECT_WITH_CAT} ORDER BY r.nombre ASC, r.tamaño DESC`
    );
    return result.rows;
  }

  static async getAvailable(): Promise<Refresco[]> {
    const result = await pool.query(
      `${SELECT_WITH_CAT} WHERE r.disponible = true ORDER BY r.nombre ASC, r.tamaño DESC`
    );
    return result.rows;
  }

  static async getById(id: number): Promise<Refresco | null> {
    const result = await pool.query(
      `${SELECT_WITH_CAT} WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(refresco: {
    nombre: string; sabor: string; tamaño: string;
    precio: number; disponible: boolean; categoria_id: number | null;
  }): Promise<Refresco> {
    const result = await pool.query(
      `INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [refresco.nombre, refresco.sabor, refresco.tamaño,
       refresco.precio, refresco.disponible, refresco.categoria_id ?? null]
    );
    return result.rows[0];
  }

  static async update(id: number, refresco: Partial<{
    nombre: string; sabor: string; tamaño: string;
    precio: number; disponible: boolean; categoria_id: number | null;
  }>): Promise<Refresco | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (refresco.nombre     !== undefined) { fields.push(`nombre = $${p++}`);      values.push(refresco.nombre); }
    if (refresco.sabor      !== undefined) { fields.push(`sabor = $${p++}`);       values.push(refresco.sabor); }
    if (refresco.tamaño     !== undefined) { fields.push(`tamaño = $${p++}`);      values.push(refresco.tamaño); }
    if (refresco.precio     !== undefined) { fields.push(`precio = $${p++}`);      values.push(refresco.precio); }
    if (refresco.disponible !== undefined) { fields.push(`disponible = $${p++}`);  values.push(refresco.disponible); }
    if (refresco.categoria_id !== undefined) { fields.push(`categoria_id = $${p++}`); values.push(refresco.categoria_id); }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE refrescos SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM refrescos WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
