import { Router } from 'express';
import { OrdenController } from '../controllers/orden.controller';
import { authenticate, authorize, kitchenAuth } from '../middleware/auth.middleware';

const router = Router();

// Endpoint de solo lectura para la pantalla de cocina (usa KITCHEN_TOKEN, no JWT)
router.get('/cocina', kitchenAuth, OrdenController.getOrdenesDelTurno);

// Rutas que pueden usar todos los usuarios autenticados
router.get('/',      authenticate, OrdenController.getAll);
router.get('/turno', authenticate, OrdenController.getOrdenesDelTurno);
router.get('/:id',   authenticate, OrdenController.getById);
router.post('/', authenticate, OrdenController.create);

// Rutas solo para administradores
router.put('/:id',          authenticate, authorize('administrador'), OrdenController.update);
router.patch('/:id/estado', authenticate, authorize('administrador'), OrdenController.updateEstado);
router.delete('/:id',       authenticate, authorize('administrador'), OrdenController.delete);

export default router;