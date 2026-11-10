import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ResumenModel, MetodoPagoFiltro } from '../models/resumen.model';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ_RE    = /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+)*$/;
const TZ_DEFAULT = 'America/Mexico_City';
const MAX_DIAS_RANGO = 731; // ~2 años

function fechaValida(s: unknown): s is string {
  if (typeof s !== 'string' || !FECHA_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export class ResumenController {
  /**
   * Reporte por rango de fechas.
   * Query: desde=YYYY-MM-DD, hasta=YYYY-MM-DD, metodo_pago=todos|efectivo|tarjeta, tz=<IANA>
   */
  static async getReporte(req: AuthRequest, res: Response): Promise<void> {
    const { desde, hasta } = req.query;
    if (!fechaValida(desde) || !fechaValida(hasta)) {
      res.status(400).json({ message: 'Fechas inválidas (formato AAAA-MM-DD)' });
      return;
    }
    if (desde > hasta) {
      res.status(400).json({ message: 'La fecha "Desde" no puede ser mayor que "Hasta"' });
      return;
    }
    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000 + 1;
    if (dias > MAX_DIAS_RANGO) {
      res.status(400).json({ message: 'El rango máximo es de 2 años' });
      return;
    }

    const metodoRaw = String(req.query.metodo_pago ?? 'todos');
    const metodo: MetodoPagoFiltro =
      metodoRaw === 'efectivo' || metodoRaw === 'tarjeta' ? metodoRaw : 'todos';

    const tzRaw = typeof req.query.tz === 'string' ? req.query.tz : '';
    const tz = TZ_RE.test(tzRaw) ? tzRaw : TZ_DEFAULT;

    try {
      const reporte = await ResumenModel.getReporte(desde, hasta, metodo, tz);
      res.json(reporte);
    } catch (error: any) {
      // 22023 = invalid_parameter_value (zona horaria desconocida) → reintentar con la default
      if (error?.code === '22023' && tz !== TZ_DEFAULT) {
        try {
          res.json(await ResumenModel.getReporte(desde, hasta, metodo, TZ_DEFAULT));
          return;
        } catch (e) { error = e; }
      }
      console.error('Error al generar reporte:', error);
      res.status(500).json({ message: 'Error al generar el reporte' });
    }
  }

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
