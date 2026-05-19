import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // One row per category; quantity persists (not daily reset)
    await client.query(`
      CREATE TABLE IF NOT EXISTS refri_inventario (
        id            SERIAL PRIMARY KEY,
        categoria_id  INTEGER UNIQUE NOT NULL
                        REFERENCES categorias_refresco(id) ON DELETE CASCADE,
        cantidad      INTEGER NOT NULL DEFAULT 0,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed one row per existing category (cantidad = 0)
    await client.query(`
      INSERT INTO refri_inventario (categoria_id)
        SELECT id FROM categorias_refresco
      ON CONFLICT (categoria_id) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✓ Tabla refri_inventario creada y poblada con categorías existentes');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
