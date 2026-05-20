/**
 * Seed: crea las 2 bebidas combo y actualiza los precios de las promociones.
 *
 * Combo Familiar  (promo id=2): 10 gorditas harina + Refresco 1.75 combo = $228
 *   → Refresco 1.75 combo: $228 - (10 × $20) = $28
 *
 * Combo Individual (promo id=1): 3 gorditas harina + Lata combo = $80
 *   → Lata combo: $80 - (3 × $20) = $20
 */
import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Actualizar precios de los promos ──────────────────────────────
    await client.query(`UPDATE promociones SET precio_fijo = 228 WHERE id = 2`);
    await client.query(`UPDATE promociones SET precio_fijo = 80  WHERE id = 1`);

    // ── 2. Limpiar condiciones anteriores y recrearlas ───────────────────
    await client.query(`DELETE FROM promocion_condiciones WHERE promocion_id IN (1, 2)`);

    // COMBO_FAMILIAR (id=2): requiere 10 gorditas de Harina
    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre)
      VALUES (2, 'gorditas_masa', 10, 'Harina')
    `);

    // COMBO_INDIVIDUAL (id=1): requiere 3 gorditas de Harina
    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre)
      VALUES (1, 'gorditas_masa', 3, 'Harina')
    `);

    // ── 3. Actualizar descripciones de los promos ────────────────────────
    await client.query(`
      UPDATE promociones
      SET descripcion = '10 gorditas de harina con guisados a escoger + 1 refresco 1.75 L'
      WHERE id = 2
    `);
    await client.query(`
      UPDATE promociones
      SET descripcion = '1 gordita de frijoles con queso + 2 gorditas a elegir de harina + 1 refresco de lata'
      WHERE id = 1
    `);

    // ── 4. Crear bebida "Refresco 1.75 combo" (categoria Familiar = id 3) ──
    const existeFamiliar = await client.query(
      `SELECT id FROM refrescos WHERE nombre = 'Refresco 1.75 combo' LIMIT 1`
    );
    if (existeFamiliar.rows.length === 0) {
      await client.query(`
        INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible, categoria_id)
        VALUES ('Refresco 1.75 combo', 'combo', '1.75L combo', 28, true, 3)
      `);
      console.log('✓ Creado: Refresco 1.75 combo ($28)');
    } else {
      await client.query(`UPDATE refrescos SET precio = 28 WHERE nombre = 'Refresco 1.75 combo'`);
      console.log('✓ Actualizado: Refresco 1.75 combo ($28)');
    }

    // ── 5. Crear bebida "Lata combo" (categoria Lata = id 2) ─────────────
    const existeLata = await client.query(
      `SELECT id FROM refrescos WHERE nombre = 'Lata combo' LIMIT 1`
    );
    if (existeLata.rows.length === 0) {
      await client.query(`
        INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible, categoria_id)
        VALUES ('Lata combo', 'combo', 'lata combo', 20, true, 2)
      `);
      console.log('✓ Creado: Lata combo ($20)');
    } else {
      await client.query(`UPDATE refrescos SET precio = 20 WHERE nombre = 'Lata combo'`);
      console.log('✓ Actualizado: Lata combo ($20)');
    }

    await client.query('COMMIT');
    console.log('✓ Seed de combos completado correctamente');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
