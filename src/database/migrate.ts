import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'init.sql'),
      'utf-8'
    );

    await pool.query(sql);
    console.log('✓ Migración ejecutada exitosamente');
    console.log('✓ Tablas creadas en la base de datos');
    
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando migración:', error);
    process.exit(1);
  }
};

runMigration();