import { Router } from 'express';
import { CategoriaRefrescoController } from '../controllers/categoriaRefresco.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/',    authenticate, CategoriaRefrescoController.getAll);
router.post('/',   authenticate, authorize('administrador'), CategoriaRefrescoController.create);
router.put('/:id', authenticate, authorize('administrador'), CategoriaRefrescoController.update);
router.delete('/:id', authenticate, authorize('administrador'), CategoriaRefrescoController.delete);

export default router;
