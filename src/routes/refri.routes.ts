import { Router } from 'express';
import { RefriController } from '../controllers/refri.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',                            authenticate, RefriController.getAll);
router.patch('/:categoriaId/ajustar',     authenticate, RefriController.ajustar);
router.put('/:categoriaId',               authenticate, RefriController.setCantidad);

export default router;
