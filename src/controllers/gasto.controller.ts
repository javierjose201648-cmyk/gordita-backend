import { Response } from 'express';
import { GastoModel } from '../models/gasto.model';
import { AuthRequest } from '../middleware/auth.middleware';

export class GastoController {
  static async getToday(_req: AuthRequest, res: Response) {
    try {
      res.json(await GastoModel.getToday());
    } catch {
      res.status(500).json({ message: 'Error al obtener gastos' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    const { concepto, monto } = req.body;
    if (!concepto?.trim() || monto === undefined) {
      return res.status(400).json({ message: 'Concepto y monto son requeridos' });
    }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ message: 'Monto inválido' });
    }
    try {
      const usuario_id = req.user?.id ?? null;
      const gasto = await GastoModel.create(concepto.trim(), montoNum, usuario_id);
      res.status(201).json(gasto);
    } catch {
      res.status(500).json({ message: 'Error al crear gasto' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const deleted = await GastoModel.delete(id);
      if (!deleted) return res.status(404).json({ message: 'Gasto no encontrado' });
      res.json({ message: 'Gasto eliminado' });
    } catch {
      res.status(500).json({ message: 'Error al eliminar gasto' });
    }
  }
}
