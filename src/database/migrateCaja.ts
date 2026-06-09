import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Agregar metodo_pago a ordenes (efectivo/tarjeta)
    await client.query(`
      ALTER TABLE ordenes
        ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(10) NOT NULL DEFAULT 'efectivo'
    `);
    console.log('✓ ordenes.metodo_pago agregado');

    // 2. Agregar caja_inicial y caja_final a turnos
    await client.query(`
      ALTER TABLE turnos
        ADD COLUMN IF NOT EXISTS caja_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS caja_final   DECIMAL(10,2) NULL
    `);
    console.log('✓ turnos.caja_inicial y caja_final agregados');

    // 3. Crear tabla caja_movimientos (dinero ingresado a la caja durante el turno)
    await client.query(`
      CREATE TABLE IF NOT EXISTS caja_movimientos (
        id         SERIAL PRIMARY KEY,
        turno_id   INTEGER NOT NULL REFERENCES turnos(id),
        monto      DECIMAL(10,2) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id),
        creado_en  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_caja_movimientos_turno
        ON caja_movimientos (turno_id)
    `);
    console.log('✓ Tabla caja_movimientos creada');

    console.log('\n✅ Migración de Caja completada correctamente');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
