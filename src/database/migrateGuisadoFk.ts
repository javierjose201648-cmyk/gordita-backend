import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop old FK on orden_items.guisado_id (no ON DELETE behaviour → blocks deletes)
    await client.query(`
      ALTER TABLE orden_items
        DROP CONSTRAINT IF EXISTS orden_items_guisado_id_fkey
    `);

    // Re-add with ON DELETE SET NULL so deleting a guisado keeps order history
    await client.query(`
      ALTER TABLE orden_items
        ADD CONSTRAINT orden_items_guisado_id_fkey
        FOREIGN KEY (guisado_id) REFERENCES guisados(id) ON DELETE SET NULL
    `);

    // Same fix for tipos_masa FK (prevents masa deletion as well)
    await client.query(`
      ALTER TABLE orden_items
        DROP CONSTRAINT IF EXISTS orden_items_tipo_masa_id_fkey
    `);
    await client.query(`
      ALTER TABLE orden_items
        ADD CONSTRAINT orden_items_tipo_masa_id_fkey
        FOREIGN KEY (tipo_masa_id) REFERENCES tipos_masa(id) ON DELETE SET NULL
    `);

    await client.query('COMMIT');
    console.log('✓ FK orden_items → guisados: ON DELETE SET NULL aplicado');
    console.log('✓ FK orden_items → tipos_masa: ON DELETE SET NULL aplicado');
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
