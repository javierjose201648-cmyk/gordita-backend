import { Router } from 'express';
import { CajaController } from '../controllers/caja.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Accesible para todos los usuarios autenticados (admin y empleado)
router.get('/turno', authenticate, CajaController.getDelTurno);
router.post('/',     authenticate, CajaController.create);

export default router;
