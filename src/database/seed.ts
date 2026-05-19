import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runSeeds = async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'seeds.sql'),
      'utf-8'
    );

    await pool.query(sql);
    console.log('✓ Seeds ejecutados exitosamente');
    console.log('✓ Datos iniciales insertados en la base de datos');
    
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando seeds:', error);
    process.exit(1);
  }
};

runSeeds();