import { Request, Response } from 'express';
import { TipoMasaModel } from '../models/tipoMasa.model';

export class TipoMasaController {
  static async getAll(req: Request, res: Response) {
    try {
      const tiposMasa = await TipoMasaModel.getAll();
      res.json(tiposMasa);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener tipos de masa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAvailable(req: Request, res: Response) {
    try {
      const tiposMasa = await TipoMasaModel.getAvailable();
      res.json(tiposMasa);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener tipos de masa disponibles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const tipoMasa = await TipoMasaModel.getById(id);
      
      if (!tipoMasa) {
        return res.status(404).json({ message: 'Tipo de masa no encontrado' });
      }
      
      res.json(tipoMasa);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener tipo de masa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { nombre, precio, disponible } = req.body;

      if (!nombre) {
        return res.status(400).json({
          message: 'Nombre es requerido'
        });
      }

      const tipoMasa = await TipoMasaModel.create({
        nombre,
        precio: precio ?? 0,
        disponible: disponible ?? true
      });

      res.status(201).json(tipoMasa);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear tipo de masa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const tipoMasa = await TipoMasaModel.update(id, req.body);

      if (!tipoMasa) {
        return res.status(404).json({ message: 'Tipo de masa no encontrado' });
      }

      res.json(tipoMasa);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar tipo de masa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await TipoMasaModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Tipo de masa no encontrado' });
      }

      res.json({ message: 'Tipo de masa eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar tipo de masa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}