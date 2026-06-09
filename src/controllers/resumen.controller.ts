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

  /**
   * Cierre de turno.
   * Body: { caja_final: number } — cuánto dinero se deja en la caja para mañana.
   */
  static async cerrarTurno(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cajaFinal = parseFloat(req.body?.caja_final ?? 0) || 0;
      await ResumenModel.cerrarTurno(cajaFinal);
      res.json({ message: 'Turno cerrado correctamente' });
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      res.status(500).json({ message: 'Error al cerrar el turno' });
    }
  }
}
