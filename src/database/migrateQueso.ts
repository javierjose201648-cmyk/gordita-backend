import pool from '../config/database';

/**
 * Extra "Queso" a $10 por gordita.
 * El seed original creó "Queso extra" a $8 (sin uso) → se renombra y actualiza;
 * si no existe, se inserta.
 */
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const renamed = await client.query(`
      UPDATE extras SET nombre = 'Queso', precio = 10.00, disponible = true
      WHERE nombre IN ('Queso extra', 'Queso')
      RETURNING id
    `);

    if (renamed.rowCount === 0) {
      await client.query(`
        INSERT INTO extras (nombre, precio, disponible) VALUES ('Queso', 10.00, true)
      `);
    }

    await client.query('COMMIT');
    console.log('✓ extra "Queso" listo a $10');
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
