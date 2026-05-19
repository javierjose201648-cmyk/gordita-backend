import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', AuthController.login);

// Rutas protegidas (solo administrador puede registrar nuevos usuarios)
router.post('/register', authenticate, authorize('administrador'), AuthController.register);

export default router;