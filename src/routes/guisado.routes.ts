import { Router } from 'express';
import { GuisadoController } from '../controllers/guisado.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden ver todos los usuarios autenticados
router.get('/', authenticate, GuisadoController.getAll);
router.get('/disponibles', authenticate, GuisadoController.getAvailable);
router.get('/:id', authenticate, GuisadoController.getById);

// Rutas solo para administradores
router.post('/', authenticate, authorize('administrador'), GuisadoController.create);
router.put('/:id', authenticate, authorize('administrador'), GuisadoController.update);
router.delete('/:id', authenticate, authorize('administrador'), GuisadoController.delete);

export default router;
