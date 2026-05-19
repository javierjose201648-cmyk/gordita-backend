import { Router } from 'express';
import { TipoMasaController } from '../controllers/tipoMasa.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas que pueden ver todos los usuarios autenticados
router.get('/', authenticate, TipoMasaController.getAll);
router.get('/disponibles', authenticate, TipoMasaController.getAvailable);
router.get('/:id', authenticate, TipoMasaController.getById);

// Rutas solo para administradores
router.post('/', authenticate, authorize('administrador'), TipoMasaController.create);
router.put('/:id', authenticate, authorize('administrador'), TipoMasaController.update);
router.delete('/:id', authenticate, authorize('administrador'), TipoMasaController.delete);

export default router;