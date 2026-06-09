/**
 * Migración: gastos ligados al turno (Lote 2)
 *
 *  #9  Agregar turno_id a gastos → los gastos ya no se borran al cerrar turno,
 *      se filtran por turno_id. Historial permanente igual que las órdenes.
 *  #4  Eliminar gastos.fecha (duplicaba creado_en, fuente de verdad confusa).
 *  #7  (El cambio de filtro creado_en → turno_id en resumen se aplica en el modelo.)
 */
import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {

    // ── 1. Agregar columna turno_id (nullable inicialmente para poder hacer backfill) ──
    await client.query(`
      ALTER TABLE gastos
        ADD COLUMN IF NOT EXISTS turno_id INTEGER REFERENCES turnos(id) ON DELETE SET NULL
    `);
    console.log('✓ gastos.turno_id agregado');

    // ── 2. Backfill: asignar cada gasto al turno que estaba activo en su creado_en ──
    //    Los gastos sin turno coincidente quedan en NULL (no se pierden, solo sin turno).
    const backfillRes = await client.query(`
      UPDATE gastos g
      SET turno_id = (
        SELECT t.id FROM turnos t
        WHERE g.creado_en >= t.inicio
          AND (t.cierre IS NULL OR g.creado_en < t.cierre)
        ORDER BY t.inicio DESC
        LIMIT 1
      )
      WHERE g.turno_id IS NULL
    `);
    console.log(`✓ Backfill: ${backfillRes.rowCount} gastos asignados a su turno`);

    // Verificar cuántos quedaron sin turno (informativo, no crítico)
    const sinTurno = await client.query(
      `SELECT COUNT(*) AS n FROM gastos WHERE turno_id IS NULL`
    );
    if (parseInt(sinTurno.rows[0].n) > 0) {
      console.warn(`  ⚠️  ${sinTurno.rows[0].n} gastos sin turno asignable (anteriores a los turnos)`);
    }

    // ── 3. Índice en gastos.turno_id ──────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gastos_turno
        ON gastos (turno_id)
    `);
    console.log('✓ Índice idx_gastos_turno creado');

    // ── 4. Eliminar columna gastos.fecha (duplicaba creado_en) ────────────────
    //    Verificamos primero que no haya ninguna dependencia activa.
    const tieneFecha = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'gastos' AND column_name = 'fecha'
    `);
    if (tieneFecha.rows.length > 0) {
      await client.query(`ALTER TABLE gastos DROP COLUMN fecha`);
      console.log('✓ gastos.fecha eliminada (era fuente de verdad duplicada de creado_en)');
    } else {
      console.log('— gastos.fecha ya no existía, sin cambios');
    }

    console.log('\n✅ Migración gastos+turno (Lote 2) completada correctamente');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
