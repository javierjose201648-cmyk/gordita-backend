import pool from '../config/database';

export interface Turno {
  id: number;
  inicio: Date;
  cierre: Date | null;
  activo: boolean;
  caja_inicial: number;
  caja_final: number | null;
}

export class TurnoModel {
  static async getActivo(): Promise<Turno | null> {
    const result = await pool.query(
      `SELECT * FROM turnos WHERE activo = TRUE LIMIT 1`
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      caja_inicial: parseFloat(row.caja_inicial ?? 0),
      caja_final:   row.caja_final != null ? parseFloat(row.caja_final) : null,
    };
  }

  /**
   * Devuelve el turno activo, o crea uno nuevo si no existe.
   * Al crear uno nuevo, toma caja_inicial del caja_final del último turno cerrado.
   */
  static async getOrCrearActivo(): Promise<Turno> {
    const activo = await this.getActivo();
    if (activo) return activo;

    // Buscar el caja_final del último turno cerrado
    const ultimoRes = await pool.query(
      `SELECT caja_final FROM turnos
       WHERE activo = FALSE AND caja_final IS NOT NULL
       ORDER BY cierre DESC LIMIT 1`
    );
    const cajaInicial = ultimoRes.rows[0]?.caja_final
      ? parseFloat(ultimoRes.rows[0].caja_final)
      : 0;

    const result = await pool.query(
      `INSERT INTO turnos (inicio, activo, caja_inicial)
       VALUES (NOW(), TRUE, $1) RETURNING *`,
      [cajaInicial]
    );
    const row = result.rows[0];
    return {
      ...row,
      caja_inicial: parseFloat(row.caja_inicial ?? 0),
      caja_final:   null,
    };
  }

  /** Cierra el turno guardando cuánto dinero queda en la caja para el siguiente */
  static async cerrar(id: number, cajaFinal: number = 0): Promise<void> {
    await pool.query(
      `UPDATE turnos
       SET cierre = NOW(), activo = FALSE, caja_final = $1
       WHERE id = $2`,
      [cajaFinal, id]
    );
  }
}
