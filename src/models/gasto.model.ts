import pool from '../config/database';

export interface Gasto {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  usuario_id: number | null;
  creado_en: Date;
}

export class GastoModel {
  static async getToday(): Promise<Gasto[]> {
    const result = await pool.query(
      `SELECT * FROM gastos WHERE fecha = CURRENT_DATE ORDER BY creado_en DESC`
    );
    return result.rows;
  }

  static async create(
    concepto: string,
    monto: number,
    usuario_id: number | null
  ): Promise<Gasto> {
    const result = await pool.query(
      `INSERT INTO gastos (concepto, monto, usuario_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [concepto, monto, usuario_id]
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM gastos WHERE id = $1`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
