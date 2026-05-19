import { Response } from 'express';
import { RefriModel } from '../models/refri.model';
import { AuthRequest } from '../middleware/auth.middleware';

export class RefriController {
  static async getAll(_req: AuthRequest, res: Response) {
    try {
      res.json(await RefriModel.getAll());
    } catch {
      res.status(500).json({ message: 'Error al obtener inventario de refri' });
    }
  }

  /** PATCH /api/refri/:categoriaId/ajustar  { delta: number } */
  static async ajustar(req: AuthRequest, res: Response) {
    const categoria_id = parseInt(req.params.categoriaId as string);
    const { delta } = req.body;
    if (delta === undefined || isNaN(Number(delta))) {
      return res.status(400).json({ message: 'delta es requerido' });
    }
    try {
      const entry = await RefriModel.ajustar(categoria_id, Number(delta));
      if (!entry) return res.status(404).json({ message: 'Categoría no encontrada en refri' });
      res.json(entry);
    } catch {
      res.status(500).json({ message: 'Error al ajustar inventario' });
    }
  }

  /** PUT /api/refri/:categoriaId  { cantidad: number } */
  static async setCantidad(req: AuthRequest, res: Response) {
    const categoria_id = parseInt(req.params.categoriaId as string);
    const { cantidad } = req.body;
    if (cantidad === undefined || isNaN(Number(cantidad))) {
      return res.status(400).json({ message: 'cantidad es requerida' });
    }
    try {
      const entry = await RefriModel.setCantidad(categoria_id, Number(cantidad));
      if (!entry) return res.status(404).json({ message: 'Categoría no encontrada en refri' });
      res.json(entry);
    } catch {
      res.status(500).json({ message: 'Error al establecer inventario' });
    }
  }
}
