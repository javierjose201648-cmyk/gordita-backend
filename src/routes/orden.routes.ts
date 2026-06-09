import { Router } from 'express';
import { OrdenController } from '../controllers/orden.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden usar todos los usuarios autenticados
router.get('/',      authenticate, OrdenController.getAll);
router.get('/turno', authenticate, OrdenController.getOrdenesDelTurno);
router.get('/:id',   authenticate, OrdenController.getById);
router.post('/', authenticate, OrdenController.create);

// Rutas solo para administradores
router.patch('/:id/estado', authenticate, authorize('administrador'), OrdenController.updateEstado);
router.delete('/:id', authenticate, authorize('administrador'), OrdenController.delete);

export default router;