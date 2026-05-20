import { Router } from 'express';
import { ResumenController } from '../controllers/resumen.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admin only
router.get('/hoy',    authenticate, authorize('administrador'), ResumenController.getHoy);
router.post('/cerrar', authenticate, authorize('administrador'), ResumenController.cerrarTurno);

export default router;
