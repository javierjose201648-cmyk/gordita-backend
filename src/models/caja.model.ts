import pool from '../config/database';

export interface CajaMovimiento {
  id: number;
  turno_id: number;
  monto: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  creado_en: string;
}

export class CajaModel {
  /** Devuelve todos los movimientos de caja de un turno, con nombre del empleado */
  static async getDelTurno(turnoId: number): Promise<CajaMovimiento[]> {
    const result = await pool.query(
      `SELECT
         cm.id,
         cm.turno_id,
         cm.monto::numeric AS monto,
         cm.usuario_id,
         u.nombre_completo AS usuario_nombre,
         cm.creado_en
       FROM caja_movimientos cm
       LEFT JOIN usuarios u ON u.id = cm.usuario_id
       WHERE cm.turno_id = $1
       ORDER BY cm.creado_en ASC`,
      [turnoId]
    );
    return result.rows.map(r => ({
      ...r,
      monto: parseFloat(r.monto),
    }));
  }

  /** Registra un ingreso de dinero a la caja */
  static async create(
    turnoId: number,
    monto: number,
    usuarioId: number
  ): Promise<CajaMovimiento> {
    const result = await pool.query(
      `INSERT INTO caja_movimientos (turno_id, monto, usuario_id)
       VALUES ($1, $2, $3)
       RETURNING id, turno_id, monto::numeric AS monto, usuario_id, creado_en`,
      [turnoId, monto, usuarioId]
    );
    const row = result.rows[0];

    // Obtener nombre del usuario para devolverlo en la respuesta
    const userRes = await pool.query(
      `SELECT nombre_completo FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    return {
      ...row,
      monto: parseFloat(row.monto),
      usuario_nombre: userRes.rows[0]?.nombre_completo ?? null,
    };
  }
}
