import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS turnos (
        id       SERIAL PRIMARY KEY,
        inicio   TIMESTAMP NOT NULL DEFAULT NOW(),
        cierre   TIMESTAMP NULL,
        activo   BOOLEAN   NOT NULL DEFAULT TRUE
      )
    `);

    // Asegurar que solo exista un turno activo a la vez
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS turnos_activo_unico
        ON turnos (activo) WHERE activo = TRUE
    `);

    // Insertar el turno inicial si no existe ninguno:
    // inicio = inicio del día actual para que muestre las órdenes de hoy
    await client.query(`
      INSERT INTO turnos (inicio, activo)
      SELECT DATE_TRUNC('day', NOW()), TRUE
      WHERE NOT EXISTS (SELECT 1 FROM turnos)
    `);

    console.log('✓ Tabla turnos creada y turno inicial insertado');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
