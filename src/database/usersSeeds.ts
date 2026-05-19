import pool from '../config/database';
import bcrypt from 'bcrypt';

const createInitialUsers = async () => {
  try {
    const saltRounds = 10;

    // Usuario administrador
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    await pool.query(
      `INSERT INTO usuarios (username, password, nombre_completo, rol, activo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminPassword, 'Administrador', 'administrador', true]
    );

    // Usuario empleado de prueba
    const empleadoPassword = await bcrypt.hash('empleado123', saltRounds);
    await pool.query(
      `INSERT INTO usuarios (username, password, nombre_completo, rol, activo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      ['empleado1', empleadoPassword, 'Empleado Uno', 'empleado', true]
    );

    console.log('✓ Usuarios iniciales creados:');
    console.log('  - admin / admin123 (Administrador)');
    console.log('  - empleado1 / empleado123 (Empleado)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuarios iniciales:', error);
    process.exit(1);
  }
};

createInitialUsers();
