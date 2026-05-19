import { Request, Response } from 'express';
import { GuisadoModel } from '../models/guisado.model';

export class GuisadoController {
  static async getAll(req: Request, res: Response) {
    try {
      const guisados = await GuisadoModel.getAll();
      res.json(guisados);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener guisados',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAvailable(req: Request, res: Response) {
    try {
      const guisados = await GuisadoModel.getAvailable();
      res.json(guisados);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener guisados disponibles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const guisado = await GuisadoModel.getById(id);
      
      if (!guisado) {
        return res.status(404).json({ message: 'Guisado no encontrado' });
      }
      
      res.json(guisado);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener guisado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { nombre, precio, disponible, descripcion } = req.body;

      if (!nombre || precio === undefined) {
        return res.status(400).json({ 
          message: 'Nombre y precio son requeridos' 
        });
      }

      const guisado = await GuisadoModel.create({
        nombre,
        precio,
        disponible: disponible ?? true,
        descripcion
      });

      res.status(201).json(guisado);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear guisado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const guisado = await GuisadoModel.update(id, req.body);

      if (!guisado) {
        return res.status(404).json({ message: 'Guisado no encontrado' });
      }

      res.json(guisado);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar guisado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await GuisadoModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Guisado no encontrado' });
      }

      res.json({ message: 'Guisado eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar guisado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}