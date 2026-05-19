import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UsuarioModel } from '../models/usuario.model';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username y password son requeridos' 
        });
      }

      const result = await AuthService.login(username, password);

      if (!result) {
        return res.status(401).json({ 
          message: 'Credenciales inválidas' 
        });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error en el login',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { username, password, nombre_completo, rol } = req.body;

      if (!username || !password || !nombre_completo) {
        return res.status(400).json({ 
          message: 'Username, password y nombre completo son requeridos' 
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await UsuarioModel.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ 
          message: 'El username ya está en uso' 
        });
      }

      const usuario = await UsuarioModel.create({
        username,
        password,
        nombre_completo,
        rol: rol || 'empleado',
        activo: true
      });

      res.status(201).json(usuario);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al registrar usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}