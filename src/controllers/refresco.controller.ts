import { Request, Response } from 'express';
import { RefrescoModel } from '../models/refresco.model';

export class RefrescoController {
  static async getAll(req: Request, res: Response) {
    try {
      const refrescos = await RefrescoModel.getAll();
      res.json(refrescos);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener refrescos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAvailable(req: Request, res: Response) {
    try {
      const refrescos = await RefrescoModel.getAvailable();
      res.json(refrescos);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener refrescos disponibles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const refresco = await RefrescoModel.getById(id);
      
      if (!refresco) {
        return res.status(404).json({ message: 'Refresco no encontrado' });
      }
      
      res.json(refresco);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener refresco',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { nombre, sabor, tamaño, precio, disponible } = req.body;

      if (!nombre || !sabor || !tamaño || precio === undefined) {
        return res.status(400).json({ 
          message: 'Nombre, sabor, tamaño y precio son requeridos' 
        });
      }

      const refresco = await RefrescoModel.create({
        nombre,
        sabor,
        tamaño,
        precio,
        disponible: disponible ?? true
      });

      res.status(201).json(refresco);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear refresco',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const refresco = await RefrescoModel.update(id, req.body);

      if (!refresco) {
        return res.status(404).json({ message: 'Refresco no encontrado' });
      }

      res.json(refresco);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar refresco',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await RefrescoModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Refresco no encontrado' });
      }

      res.json({ message: 'Refresco eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar refresco',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}