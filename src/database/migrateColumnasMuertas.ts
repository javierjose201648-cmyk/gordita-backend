/**
 * Migración: columnas muertas y renombrado (Lote 3)
 *
 *  #11  Drop columnas nunca usadas en ningún modelo:
 *         - promociones.cantidad_minima
 *         - promociones.descuento_porcentaje
 *         - ordenes.nombre_cliente
 *  #12  Renombrar tipos_masa.precio_extra → precio
 *       (el nombre era engañoso: contiene el precio TOTAL de la gordita, no un extra)
 */
import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {

    // ── #11a  promociones.cantidad_minima ─────────────────────────────────────
    await client.query(`ALTER TABLE promociones DROP COLUMN IF EXISTS cantidad_minima`);
    console.log('✓ #11 promociones.cantidad_minima eliminada');

    // ── #11b  promociones.descuento_porcentaje ────────────────────────────────
    await client.query(`ALTER TABLE promociones DROP COLUMN IF EXISTS descuento_porcentaje`);
    console.log('✓ #11 promociones.descuento_porcentaje eliminada');

    // ── #11c  ordenes.nombre_cliente ──────────────────────────────────────────
    await client.query(`ALTER TABLE ordenes DROP COLUMN IF EXISTS nombre_cliente`);
    console.log('✓ #11 ordenes.nombre_cliente eliminada');

    // ── #12  tipos_masa.precio_extra → precio ─────────────────────────────────
    // Verificar si la columna aún se llama precio_extra antes de renombrar
    const columnaExiste = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tipos_masa' AND column_name = 'precio_extra'
    `);
    if (columnaExiste.rows.length > 0) {
      await client.query(`ALTER TABLE tipos_masa RENAME COLUMN precio_extra TO precio`);
      console.log('✓ #12 tipos_masa.precio_extra renombrada a precio');
    } else {
      console.log('— #12 tipos_masa.precio ya existe, sin cambios');
    }

    console.log('\n✅ Migración columnas muertas (Lote 3a) completada correctamente');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
