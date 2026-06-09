import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CajaModel } from '../models/caja.model';
import { TurnoModel } from '../models/turno.model';

export class CajaController {
  /** GET /api/caja/turno — movimientos de caja del turno activo */
  static async getDelTurno(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const turno = await TurnoModel.getActivo();
      if (!turno) {
        res.json([]);
        return;
      }
      const movimientos = await CajaModel.getDelTurno(turno.id);
      res.json(movimientos);
    } catch (error) {
      console.error('Error al obtener movimientos de caja:', error);
      res.status(500).json({ message: 'Error al obtener movimientos de caja' });
    }
  }

  /** POST /api/caja — registrar un ingreso de dinero a la caja */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { monto } = req.body;
      const usuarioId = req.user?.id;

      if (!usuarioId) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const montoNum = parseFloat(monto);
      if (!monto || isNaN(montoNum) || montoNum <= 0) {
        res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        return;
      }

      const turno = await TurnoModel.getOrCrearActivo();
      const movimiento = await CajaModel.create(turno.id, montoNum, usuarioId);
      res.status(201).json(movimiento);
    } catch (error) {
      console.error('Error al registrar movimiento de caja:', error);
      res.status(500).json({ message: 'Error al registrar movimiento de caja' });
    }
  }
}
