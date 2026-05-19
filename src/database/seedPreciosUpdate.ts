import pool from '../config/database';

/**
 * Actualiza la base de datos para que los precios de las gorditas
 * dependan SOLO del tipo de masa, no del guisado.
 *
 * Reglas del negocio:
 *   - Gordita de harina  → $20
 *   - Gordita de maíz    → $22
 *   - Masa integral      → desactivada (no se vende)
 *   - Todos los guisados → precio = $0 (el precio va en la masa)
 */
async function seedPreciosUpdate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Masa de harina = $20
    await client.query(`
      UPDATE tipos_masa SET precio_extra = 20.00
      WHERE nombre ILIKE '%normal%' OR nombre ILIKE '%harina%'
    `);

    // Masa de maíz = $22
    await client.query(`
      UPDATE tipos_masa SET precio_extra = 22.00
      WHERE nombre ILIKE '%maíz%' OR nombre ILIKE '%maiz%' OR nombre ILIKE '%azul%'
    `);

    // Masa integral → desactivar (no se usa)
    await client.query(`
      UPDATE tipos_masa SET disponible = false
      WHERE nombre ILIKE '%integral%'
    `);

    // Todos los guisados → precio = $0 (el precio lo pone la masa)
    await client.query(`UPDATE guisados SET precio = 0.00`);

    await client.query('COMMIT');
    console.log('Precios actualizados:');
    console.log('  Masa normal (harina) → $20');
    console.log('  Masa de maíz         → $22');
    console.log('  Masa integral        → desactivada');
    console.log('  Guisados             → $0 (precio en masa)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error actualizando precios:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPreciosUpdate();
