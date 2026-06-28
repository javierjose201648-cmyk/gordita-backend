import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE orden_items
        ADD COLUMN IF NOT EXISTS plato INTEGER NOT NULL DEFAULT 1
    `);

    await client.query('COMMIT');
    console.log('✓ orden_items.plato agregado (DEFAULT 1 — órdenes existentes = plato 1)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
