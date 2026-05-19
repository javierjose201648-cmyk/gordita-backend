import { Router } from 'express';
import { RefrescoController } from '../controllers/refresco.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden ver todos los usuarios autenticados
router.get('/', authenticate, RefrescoController.getAll);
router.get('/disponibles', authenticate, RefrescoController.getAvailable);
router.get('/:id', authenticate, RefrescoController.getById);

// Rutas solo para administradores
router.post('/', authenticate, authorize('administrador'), RefrescoController.create);
router.put('/:id', authenticate, authorize('administrador'), RefrescoController.update);
router.delete('/:id', authenticate, authorize('administrador'), RefrescoController.delete);

export default router;