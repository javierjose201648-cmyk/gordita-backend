import { Router } from 'express';
import { GastoController } from '../controllers/gasto.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Both roles can view and create expenses
router.get('/hoy',  authenticate, GastoController.getToday);
router.post('/',    authenticate, GastoController.create);
router.delete('/:id', authenticate, GastoController.delete);

export default router;
