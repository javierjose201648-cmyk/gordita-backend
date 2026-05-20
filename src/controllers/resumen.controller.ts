import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ResumenModel } from '../models/resumen.model';

export class ResumenController {
  static async getHoy(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const resumen = await ResumenModel.getResumenDia();
      if (!resumen) {
        res.json(null);
        return;
      }
      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener resumen del día:', error);
      res.status(500).json({ message: 'Error al obtener resumen del día' });
    }
  }

  /** Cierre de turno: elimina los gastos del día (las órdenes se conservan como registro). */
  static async cerrarTurno(_req: AuthRequest, res: Response): Promise<void> {
    try {
      await ResumenModel.cerrarTurno();
      res.json({ message: 'Turno cerrado correctamente' });
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      res.status(500).json({ message: 'Error al cerrar el turno' });
    }
  }
}
