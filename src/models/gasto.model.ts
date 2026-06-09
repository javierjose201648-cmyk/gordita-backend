import pool from '../config/database';
import { TurnoModel } from './turno.model';

export interface Gasto {
  id: number;
  concepto: string;
  monto: number;
  turno_id: number | null;
  usuario_id: number | null;
  creado_en: Date;
}

export class GastoModel {
  /** Devuelve los gastos del turno activo. Si no hay turno, lista vacía. */
  static async getToday(): Promise<Gasto[]> {
    const turno = await TurnoModel.getActivo();
    if (!turno) return [];
    const result = await pool.query(
      `SELECT * FROM gastos WHERE turno_id = $1 ORDER BY creado_en DESC`,
      [turno.id]
    );
    return result.rows;
  }

  /** Crea un gasto y lo vincula automáticamente al turno activo. */
  static async create(
    concepto: string,
    monto: number,
    usuario_id: number | null
  ): Promise<Gasto> {
    const turno = await TurnoModel.getOrCrearActivo();
    const result = await pool.query(
      `INSERT INTO gastos (concepto, monto, usuario_id, turno_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [concepto, monto, usuario_id, turno.id]
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
