import { Router } from 'express';
import { ExtraController } from '../controllers/extra.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden ver todos los usuarios autenticados
router.get('/', authenticate, ExtraController.getAll);
router.get('/disponibles', authenticate, ExtraController.getAvailable);
router.get('/:id', authenticate, ExtraController.getById);

// Rutas solo para administradores
router.post('/', authenticate, authorize('administrador'), ExtraController.create);
router.put('/:id', authenticate, authorize('administrador'), ExtraController.update);
router.delete('/:id', authenticate, authorize('administrador'), ExtraController.delete);

export default router;