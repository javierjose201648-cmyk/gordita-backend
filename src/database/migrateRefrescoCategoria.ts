import pool from '../config/database';

async function migrateRefrescoCategoria() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE refrescos
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(50)
    `);
    await client.query('COMMIT');
    console.log('✓ Columna "categoria" agregada a refrescos');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRefrescoCategoria();
