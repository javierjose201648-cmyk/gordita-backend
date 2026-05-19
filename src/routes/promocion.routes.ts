import { Router } from 'express';
import { PromocionController } from '../controllers/promocion.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden ver todos los usuarios autenticados
router.get('/', authenticate, PromocionController.getAll);
router.get('/activas', authenticate, PromocionController.getActivas);
router.get('/:id', authenticate, PromocionController.getById);

// Rutas solo para administradores
router.post('/', authenticate, authorize('administrador'), PromocionController.create);
router.put('/:id', authenticate, authorize('administrador'), PromocionController.update);
router.delete('/:id', authenticate, authorize('administrador'), PromocionController.delete);

export default router;