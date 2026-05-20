import pool from '../config/database';

export interface Turno {
  id: number;
  inicio: Date;
  cierre: Date | null;
  activo: boolean;
}

export class TurnoModel {
  static async getActivo(): Promise<Turno | null> {
    const result = await pool.query(
      `SELECT * FROM turnos WHERE activo = TRUE LIMIT 1`
    );
    return result.rows[0] ?? null;
  }

  /** Devuelve el turno activo, o crea uno nuevo si no existe. */
  static async getOrCrearActivo(): Promise<Turno> {
    const activo = await this.getActivo();
    if (activo) return activo;
    const result = await pool.query(
      `INSERT INTO turnos (inicio, activo) VALUES (NOW(), TRUE) RETURNING *`
    );
    return result.rows[0];
  }

  static async cerrar(id: number): Promise<void> {
    await pool.query(
      `UPDATE turnos SET cierre = NOW(), activo = FALSE WHERE id = $1`,
      [id]
    );
  }
}
