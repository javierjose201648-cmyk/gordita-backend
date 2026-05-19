import { Request, Response } from 'express';
import { ExtraModel } from '../models/extra.model';

export class ExtraController {
  static async getAll(req: Request, res: Response) {
    try {
      const extras = await ExtraModel.getAll();
      res.json(extras);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener extras',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAvailable(req: Request, res: Response) {
    try {
      const extras = await ExtraModel.getAvailable();
      res.json(extras);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener extras disponibles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const extra = await ExtraModel.getById(id);
      
      if (!extra) {
        return res.status(404).json({ message: 'Extra no encontrado' });
      }
      
      res.json(extra);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener extra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { nombre, precio, disponible } = req.body;

      if (!nombre || precio === undefined) {
        return res.status(400).json({ 
          message: 'Nombre y precio son requeridos' 
        });
      }

      const extra = await ExtraModel.create({
        nombre,
        precio,
        disponible: disponible ?? true
      });

      res.status(201).json(extra);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear extra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const extra = await ExtraModel.update(id, req.body);

      if (!extra) {
        return res.status(404).json({ message: 'Extra no encontrado' });
      }

      res.json(extra);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar extra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await ExtraModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Extra no encontrado' });
      }

      res.json({ message: 'Extra eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar extra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}