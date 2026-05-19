import * as jwt from 'jsonwebtoken';
import { UsuarioModel, Usuario } from '../models/usuario.model';

export interface TokenPayload {
  id: number;
  username: string;
  rol: string;
}

export class AuthService {
  static generateToken(user: Usuario): string {
    const payload: TokenPayload = {
      id: user.id,
      username: user.username,
      rol: user.rol
    };

    const secret: jwt.Secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'];
    const options: jwt.SignOptions = {
      expiresIn
    };

    return jwt.sign(payload, secret, options);
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  static async login(username: string, password: string): Promise<{ token: string; usuario: any } | null> {
    const usuario = await UsuarioModel.verifyPassword(username, password);
    
    if (!usuario) {
      return null;
    }

    // Actualizar último acceso
    await UsuarioModel.updateUltimoAcceso(usuario.id);

    const token = this.generateToken(usuario);

    return {
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol
      }
    };
  }
}