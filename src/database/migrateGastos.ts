import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id         SERIAL PRIMARY KEY,
        concepto   VARCHAR(200) NOT NULL,
        monto      DECIMAL(10, 2) NOT NULL,
        fecha      DATE DEFAULT CURRENT_DATE,
        usuario_id INTEGER,
        creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabla gastos creada');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
