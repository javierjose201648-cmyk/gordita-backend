import pool from '../config/database';
import bcrypt from 'bcrypt';

export interface Usuario {
  id: number;
  username: string;
  password: string;
  nombre_completo: string;
  rol: 'administrador' | 'empleado';
  activo: boolean;
  creado_en: Date;
  ultimo_acceso?: Date;
}

export interface UsuarioSinPassword extends Omit<Usuario, 'password'> {}

export class UsuarioModel {
  static async findByUsername(username: string): Promise<Usuario | null> {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  static async create(usuario: Omit<Usuario, 'id' | 'creado_en' | 'ultimo_acceso'>): Promise<UsuarioSinPassword> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(usuario.password, saltRounds);

    const result = await pool.query(
      `INSERT INTO usuarios (username, password, nombre_completo, rol, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, nombre_completo, rol, activo, creado_en`,
      [usuario.username, hashedPassword, usuario.nombre_completo, usuario.rol, usuario.activo]
    );
    return result.rows[0];
  }

  static async getAll(): Promise<UsuarioSinPassword[]> {
    const result = await pool.query(
      `SELECT id, username, nombre_completo, rol, activo, creado_en, ultimo_acceso 
       FROM usuarios 
       ORDER BY nombre_completo ASC`
    );
    return result.rows;
  }

  static async getById(id: number): Promise<UsuarioSinPassword | null> {
    const result = await pool.query(
      `SELECT id, username, nombre_completo, rol, activo, creado_en, ultimo_acceso 
       FROM usuarios 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async update(id: number, data: Partial<Omit<Usuario, 'id' | 'password' | 'creado_en'>>): Promise<UsuarioSinPassword | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.username !== undefined) {
      fields.push(`username = $${paramCount++}`);
      values.push(data.username);
    }
    if (data.nombre_completo !== undefined) {
      fields.push(`nombre_completo = $${paramCount++}`);
      values.push(data.nombre_completo);
    }
    if (data.rol !== undefined) {
      fields.push(`rol = $${paramCount++}`);
      values.push(data.rol);
    }
    if (data.activo !== undefined) {
      fields.push(`activo = $${paramCount++}`);
      values.push(data.activo);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE usuarios 
       SET ${fields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING id, username, nombre_completo, rol, activo, creado_en, ultimo_acceso`,
      values
    );
    return result.rows[0] || null;
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async updateUltimoAcceso(id: number): Promise<void> {
    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async verifyPassword(username: string, password: string): Promise<Usuario | null> {
    const usuario = await this.findByUsername(username);
    if (!usuario || !usuario.activo) {
      return null;
    }

    const isValid = await bcrypt.compare(password, usuario.password);
    if (!isValid) {
      return null;
    }

    return usuario;
  }
}