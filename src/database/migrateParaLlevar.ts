import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE ordenes
        ADD COLUMN IF NOT EXISTS para_llevar BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query('COMMIT');
    console.log('✓ ordenes.para_llevar agregado (DEFAULT false — órdenes existentes = comer aquí)');
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
