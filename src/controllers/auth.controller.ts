import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

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
}