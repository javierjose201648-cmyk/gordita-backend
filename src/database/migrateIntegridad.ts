/**
 * Migración: integridad referencial, índices y constraints
 *
 * Lote 1 — cambios puramente aditivos (no afectan datos ni lógica existente):
 *   #2  FK ordenes.turno_id → turnos(id)
 *   #3  FK gastos.usuario_id → usuarios(id)
 *   #6  Índice en ordenes.turno_id  (impacta rendimiento de cada venta)
 *   #8  CHECK en ordenes.metodo_pago
 *   #13 Drop índices redundantes en usuarios
 *   #14 CHECK en promocion_condiciones.tipo
 */
import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {

    // ── #6  Índice en ordenes.turno_id ──────────────────────────────────────
    // Este índice acelera SELECT MAX(numero_orden) WHERE turno_id = $1
    // que se ejecuta en cada creación de orden.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_turno
        ON ordenes (turno_id)
    `);
    console.log('✓ #6  Índice idx_ordenes_turno creado');

    // ── #2  FK ordenes.turno_id → turnos(id) ───────────────────────────────
    // Primero verificamos que no existan turno_id huérfanos antes de agregar la FK.
    const huerfanosOrdenes = await client.query(`
      SELECT COUNT(*) AS n FROM ordenes
      WHERE turno_id IS NOT NULL
        AND turno_id NOT IN (SELECT id FROM turnos)
    `);
    if (parseInt(huerfanosOrdenes.rows[0].n) > 0) {
      console.warn(`⚠️  #2  ${huerfanosOrdenes.rows[0].n} órdenes con turno_id huérfano — FK omitida.`);
    } else {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'ordenes_turno_id_fkey'
              AND table_name = 'ordenes'
          ) THEN
            ALTER TABLE ordenes
              ADD CONSTRAINT ordenes_turno_id_fkey
              FOREIGN KEY (turno_id) REFERENCES turnos(id);
          END IF;
        END
        $$;
      `);
      console.log('✓ #2  FK ordenes.turno_id → turnos(id) agregada');
    }

    // ── #3  FK gastos.usuario_id → usuarios(id) ────────────────────────────
    const huerfanosGastos = await client.query(`
      SELECT COUNT(*) AS n FROM gastos
      WHERE usuario_id IS NOT NULL
        AND usuario_id NOT IN (SELECT id FROM usuarios)
    `);
    if (parseInt(huerfanosGastos.rows[0].n) > 0) {
      console.warn(`⚠️  #3  ${huerfanosGastos.rows[0].n} gastos con usuario_id huérfano — FK omitida.`);
    } else {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'gastos_usuario_id_fkey'
              AND table_name = 'gastos'
          ) THEN
            ALTER TABLE gastos
              ADD CONSTRAINT gastos_usuario_id_fkey
              FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
          END IF;
        END
        $$;
      `);
      console.log('✓ #3  FK gastos.usuario_id → usuarios(id) agregada');
    }

    // ── #8  CHECK en ordenes.metodo_pago ────────────────────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_name = 'check_metodo_pago'
        ) THEN
          ALTER TABLE ordenes
            ADD CONSTRAINT check_metodo_pago
            CHECK (metodo_pago IN ('efectivo', 'tarjeta'));
        END IF;
      END
      $$;
    `);
    console.log('✓ #8  CHECK check_metodo_pago agregado');

    // ── #14  CHECK en promocion_condiciones.tipo ────────────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_name = 'check_tipo_condicion'
        ) THEN
          ALTER TABLE promocion_condiciones
            ADD CONSTRAINT check_tipo_condicion
            CHECK (tipo IN ('gorditas_minimas', 'gorditas_masa', 'refresco_tamaño'));
        END IF;
      END
      $$;
    `);
    console.log('✓ #14 CHECK check_tipo_condicion agregado');

    // ── #13  Drop índices redundantes en usuarios ───────────────────────────
    // idx_usuarios_username duplica el índice implícito del UNIQUE(username)
    await client.query(`DROP INDEX IF EXISTS idx_usuarios_username`);
    console.log('✓ #13 idx_usuarios_username eliminado (duplicado del UNIQUE)');

    // idx_usuarios_rol tiene cardinalidad 2 — PostgreSQL lo ignora
    await client.query(`DROP INDEX IF EXISTS idx_usuarios_rol`);
    console.log('✓ #13 idx_usuarios_rol eliminado (cardinalidad 2, inútil)');

    console.log('\n✅ Migración de integridad (Lote 1) completada correctamente');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
