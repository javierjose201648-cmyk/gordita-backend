import pool from '../config/database';

async function seedPromos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove old simple promos and conditions to start fresh
    await client.query(`DELETE FROM promocion_condiciones`);
    await client.query(`DELETE FROM promociones`);

    // Reset sequence so IDs start from 1
    await client.query(`ALTER SEQUENCE promociones_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE promocion_condiciones_id_seq RESTART WITH 1`);

    // COMBO INDIVIDUAL: 3 gorditas masa normal + 1 refresco 355ml = $75
    const comboIndividual = await client.query(`
      INSERT INTO promociones (nombre, descripcion, precio_fijo, activa, fecha_inicio)
      VALUES (
        'COMBO_INDIVIDUAL',
        '3 gorditas de masa normal + 1 refresco 355ml por $75',
        75.00,
        true,
        CURRENT_DATE
      )
      RETURNING id
    `);
    const comboIndividualId = comboIndividual.rows[0].id;

    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tipo_masa_nombre)
      VALUES ($1, 'gorditas_masa', 3, 'Masa normal')
    `, [comboIndividualId]);

    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tamaño_refresco)
      VALUES ($1, 'refresco_tamaño', 1, '355ml')
    `, [comboIndividualId]);

    // COMBO FAMILIAR: 10 gorditas (cualquier masa) + 1 refresco 1.75L = $208
    const comboFamiliar = await client.query(`
      INSERT INTO promociones (nombre, descripcion, precio_fijo, activa, fecha_inicio)
      VALUES (
        'COMBO_FAMILIAR',
        '10 gorditas (cualquier masa y guisado) + 1 refresco 1.75L por $208',
        208.00,
        true,
        CURRENT_DATE
      )
      RETURNING id
    `);
    const comboFamiliarId = comboFamiliar.rows[0].id;

    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad)
      VALUES ($1, 'gorditas_minimas', 10)
    `, [comboFamiliarId]);

    await client.query(`
      INSERT INTO promocion_condiciones (promocion_id, tipo, cantidad, tamaño_refresco)
      VALUES ($1, 'refresco_tamaño', 1, '1.75L')
    `, [comboFamiliarId]);

    // Refrescos 1.75L
    await client.query(`
      INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible) VALUES
      ('Coca Cola', 'Cola', '1.75L', 45.00, true),
      ('Sprite', 'Lima-limón', '1.75L', 45.00, true),
      ('Fanta', 'Naranja', '1.75L', 45.00, true)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Seeds de promociones V2 insertados correctamente');
    console.log(`  COMBO_INDIVIDUAL (id: ${comboIndividualId}) - $75`);
    console.log(`  COMBO_FAMILIAR   (id: ${comboFamiliarId}) - $208`);
    console.log('  Refrescos 1.75L agregados');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en seeds de promociones V2:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPromos();
