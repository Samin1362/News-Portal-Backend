import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import tagRoutes from './tag.routes.js';
import articleRoutes from './article.routes.js';
import mediaRoutes from './media.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);
router.use('/articles', articleRoutes);
router.use('/media', mediaRoutes);
router.use('/public', publicRoutes);

export default router;
