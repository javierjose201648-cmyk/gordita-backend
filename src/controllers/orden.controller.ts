import { Request, Response } from 'express';
import { OrdenModel } from '../models/orden.model';

export class OrdenController {
  static async getAll(req: Request, res: Response) {
    try {
      const ordenes = await OrdenModel.getAll();
      res.json(ordenes);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener órdenes',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const orden = await OrdenModel.getById(id);
      
      if (!orden) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
      
      res.json(orden);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener orden',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const orden = await OrdenModel.create(req.body);
      res.status(201).json(orden);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al crear orden',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async updateEstado(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { estado } = req.body;

      if (!estado) {
        return res.status(400).json({ message: 'Estado es requerido' });
      }

      const orden = await OrdenModel.updateEstado(id, estado);

      if (!orden) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }

      res.json(orden);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al actualizar estado de orden',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await OrdenModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }

      res.json({ message: 'Orden eliminada correctamente' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al eliminar orden',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getResumenDia(req: Request, res: Response) {
    try {
      const resumen = await OrdenModel.getResumenDia();
      res.json(resumen);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener resumen del día',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getOrdenesDia(req: Request, res: Response) {
    try {
      const ordenes = await OrdenModel.getOrdenesDia();
      res.json(ordenes);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error al obtener órdenes del día',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}