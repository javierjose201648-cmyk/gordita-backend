import pool from '../config/database';

async function migratePromos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add precio_fijo column to promociones if not exists
    await client.query(`
      ALTER TABLE promociones
      ADD COLUMN IF NOT EXISTS precio_fijo DECIMAL(10, 2)
    `);

    // cantidad_minima is no longer required in V2 (conditions live in promocion_condiciones)
    await client.query(`
      ALTER TABLE promociones
      ALTER COLUMN cantidad_minima DROP NOT NULL
    `);

    // Create promocion_condiciones table
    await client.query(`
      CREATE TABLE IF NOT EXISTS promocion_condiciones (
        id SERIAL PRIMARY KEY,
        promocion_id INTEGER REFERENCES promociones(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        tipo_masa_nombre VARCHAR(50),
        tamaño_refresco VARCHAR(20),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for fast lookup by promocion_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_condiciones_promo
      ON promocion_condiciones(promocion_id)
    `);

    await client.query('COMMIT');
    console.log('Migración de promociones V2 completada correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migración de promociones V2:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migratePromos();
