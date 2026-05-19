import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runUsersMigration = async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'users.sql'),
      'utf-8'
    );

    await pool.query(sql);
    console.log('✓ Migración de usuarios ejecutada exitosamente');
    console.log('✓ Tabla usuarios creada');
    
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando migración de usuarios:', error);
    process.exit(1);
  }
};

runUsersMigration();