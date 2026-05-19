import pool from '../config/database';

/**
 * Fixes numero_orden uniqueness: was globally unique, must be unique per day.
 * Orders restart from 1 each day, so the constraint must be (date + numero_orden).
 */
async function migrateOrdenFix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop the global unique constraint
    await client.query(`
      ALTER TABLE ordenes DROP CONSTRAINT IF EXISTS ordenes_numero_orden_key
    `);

    // Add composite unique index: unique per calendar day
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_numero_fecha
      ON ordenes (DATE(creado_en), numero_orden)
    `);

    await client.query('COMMIT');
    console.log('Fix de numero_orden aplicado: unicidad ahora es por día');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migración fix ordenes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateOrdenFix();
