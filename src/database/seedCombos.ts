/**
 * Seed: actualiza precios y condiciones de los 2 combos.
 *
 * Combo Familiar  (COMBO_FAMILIAR):  10 gorditas harina + Refresco 1.75 combo = $228
 *   → Refresco 1.75 combo: $228 - (10 × $20) = $28
 *
 * Combo Individual (COMBO_INDIVIDUAL): 3 gorditas harina + Lata combo = $80
 *   → Lata combo: $80 - (3 × $20) = $20
 *
 * Los IDs se resuelven por nombre en lugar de estar hardcodeados,
 * para que el seed funcione correctamente aunque se recree la DB.
 */
import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 0. Resolver IDs por nombre (sin hardcodear) ──────────────────────────
    const familiarRes    = await client.query(
      `SELECT id FROM promociones WHERE nombre = 'COMBO_FAMILIAR' LIMIT 1`
    );
    const individualRes  = await client.query(
      `SELECT id FROM promociones WHERE nombre = 'COMBO_INDIVIDUAL' LIMIT 1`
    );

    if (!familiarRes.rows[0] || !individualRes.rows[0]) {
      throw new Error(
        'Promos no encontradas — ejecuta promoSeeds.ts primero para crear COMBO_FAMILIAR y COMBO_INDIVIDUAL'
      );
    }

    const familiarId    = familiarRes.rows[0].id as number;
    const individualId  = individualRes.rows[0].id as number;

    // ── 1. Actualizar precios de los promos ──────────────────────────────────
    await client.query(`UPDATE promociones SET precio_fijo = 228 WHERE id = $1`, [familiarId]);
    await client.query(`UPDATE promociones SET precio_fijo = 80  WHERE id = $1`, [individualId]);

    // ── 2. Limpiar condiciones anteriores y recrearlas ───────────────────────
    await client.query(
      `DELETE FROM promocion_condiciones WHERE promocion_id IN ($1, $2)`,
      [familiarId, individualId]
    );

    // COMBO_FAMILIAR: requiere 10 gorditas de Harina
    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre)
      VALUES ($1, 'gorditas_masa', 10, 'Harina')
    `, [familiarId]);

    // COMBO_INDIVIDUAL: requiere 3 gorditas de Harina
    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre)
      VALUES ($1, 'gorditas_masa', 3, 'Harina')
    `, [individualId]);

    // ── 3. Actualizar descripciones ──────────────────────────────────────────
    await client.query(`
      UPDATE promociones
      SET descripcion = '10 gorditas de harina con guisados a escoger + 1 refresco 1.75 L'
      WHERE id = $1
    `, [familiarId]);

    await client.query(`
      UPDATE promociones
      SET descripcion = '1 gordita de frijoles con queso + 2 gorditas a elegir de harina + 1 refresco de lata'
      WHERE id = $1
    `, [individualId]);

    // ── 4. Crear/actualizar bebida "Refresco 1.75 combo" ────────────────────
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

    // ── 5. Crear/actualizar bebida "Lata combo" ──────────────────────────────
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
    console.log(`✓ Seed de combos completado (familiar=${familiarId}, individual=${individualId})`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
