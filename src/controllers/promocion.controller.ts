import { Request, Response } from 'express';
import { PromocionModel } from '../models/promocion.model';

export class PromocionController {
  static async getAll(req: Request, res: Response) {
    try {
      const promociones = await PromocionModel.getAll();
      res.json(promociones);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener promociones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getActivas(req: Request, res: Response) {
    try {
      const promociones = await PromocionModel.getActivas();
      res.json(promociones);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener promociones activas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const promocion = await PromocionModel.getById(id);
      
      if (!promocion) {
        return res.status(404).json({ message: 'Promoción no encontrada' });
      }
      
      res.json(promocion);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener promoción',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { nombre, descripcion, precio_fijo, activa, fecha_inicio, fecha_fin, condiciones } = req.body;

      if (!nombre || !precio_fijo) {
        return res.status(400).json({
          message: 'Nombre y precio_fijo son requeridos'
        });
      }

      const promocion = await PromocionModel.create({
        nombre,
        descripcion,
        precio_fijo,
        activa: activa ?? true,
        fecha_inicio,
        fecha_fin,
        condiciones: condiciones ?? []
      });

      res.status(201).json(promocion);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear promoción',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const promocion = await PromocionModel.update(id, req.body);

      if (!promocion) {
        return res.status(404).json({ message: 'Promoción no encontrada' });
      }

      res.json(promocion);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar promoción',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await PromocionModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Promoción no encontrada' });
      }

      res.json({ message: 'Promoción eliminada correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar promoción',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}