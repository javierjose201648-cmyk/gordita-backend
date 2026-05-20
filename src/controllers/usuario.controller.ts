import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UsuarioModel } from '../models/usuario.model';
import { AuthRequest } from '../middleware/auth.middleware';

export class UsuarioController {
  static async getAll(req: Request, res: Response) {
    try {
      const usuarios = await UsuarioModel.getAll();
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener usuarios',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const usuario = await UsuarioModel.getById(id);
      
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      res.json(usuario);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { username, password, nombre_completo, rol } = req.body;
      if (!username || !password || !nombre_completo || !rol) {
        return res.status(400).json({ message: 'username, password, nombre_completo y rol son requeridos' });
      }
      const usuario = await UsuarioModel.create({ username, password, nombre_completo, rol, activo: true });
      res.status(201).json(usuario);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('ya existe')) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe' });
      }
      res.status(500).json({ message: 'Error al crear usuario', error: msg });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const usuario = await UsuarioModel.update(id, req.body);

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json(usuario);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async updatePassword(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { newPassword, oldPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: 'Nueva contraseña es requerida' });
      }

      // Cuando el admin cambia su propia contraseña, exigir la contraseña actual
      if (req.user?.id === id) {
        if (!oldPassword) {
          return res.status(400).json({ message: 'La contraseña actual es requerida' });
        }
        const hash = await UsuarioModel.getPasswordHash(id);
        if (!hash) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const valid = await bcrypt.compare(oldPassword, hash);
        if (!valid) {
          return res.status(401).json({ message: 'Contraseña actual incorrecta' });
        }
      }

      const updated = await UsuarioModel.updatePassword(id, newPassword);
      if (!updated) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      res.status(500).json({
        message: 'Error al actualizar contraseña',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      // Bloquear auto-eliminación desde el backend también
      if (req.user?.id === id) {
        return res.status(403).json({ message: 'No puedes eliminar tu propio usuario' });
      }

      const deleted = await UsuarioModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      res.status(500).json({
        message: 'Error al eliminar usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}