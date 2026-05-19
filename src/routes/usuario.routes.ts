import { Router } from 'express';
import { UsuarioController } from '../controllers/usuario.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas solo para administradores
router.get('/', authenticate, authorize('administrador'), UsuarioController.getAll);
router.get('/:id', authenticate, authorize('administrador'), UsuarioController.getById);
router.put('/:id', authenticate, authorize('administrador'), UsuarioController.update);
router.patch('/:id/password', authenticate, authorize('administrador'), UsuarioController.updatePassword);
router.delete('/:id', authenticate, authorize('administrador'), UsuarioController.delete);

export default router;