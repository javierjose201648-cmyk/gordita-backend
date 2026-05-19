import pool from '../config/database';

/**
 * Creates categorias_refresco table and migrates refrescos.categoria (text)
 * to categorias_refresco.id (FK). ON DELETE CASCADE means deleting a category
 * automatically deletes all refrescos that belong to it.
 */
async function migrateCategoriaRefresco() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create the categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias_refresco (
        id        SERIAL PRIMARY KEY,
        nombre    VARCHAR(50) NOT NULL UNIQUE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Seed categories from existing text values
    await client.query(`
      INSERT INTO categorias_refresco (nombre)
      SELECT DISTINCT categoria FROM refrescos
      WHERE categoria IS NOT NULL AND TRIM(categoria) != ''
      ON CONFLICT (nombre) DO NOTHING
    `);

    // 3. Add FK column (nullable for now — existing rows may lack a category)
    await client.query(`
      ALTER TABLE refrescos
      ADD COLUMN IF NOT EXISTS categoria_id INTEGER
        REFERENCES categorias_refresco(id) ON DELETE CASCADE
    `);

    // 4. Map text categories to FK ids
    await client.query(`
      UPDATE refrescos r
      SET    categoria_id = c.id
      FROM   categorias_refresco c
      WHERE  r.categoria = c.nombre
        AND  r.categoria_id IS NULL
    `);

    // 5. Drop the old text column
    await client.query(`
      ALTER TABLE refrescos DROP COLUMN IF EXISTS categoria
    `);

    await client.query('COMMIT');
    console.log('✓ Tabla categorias_refresco creada y datos migrados');
    console.log('✓ refrescos.categoria (text) reemplazado por categoria_id (FK)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCategoriaRefresco();
