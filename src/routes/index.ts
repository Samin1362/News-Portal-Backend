import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import tagRoutes from './tag.routes.js';
import articleRoutes from './article.routes.js';
import mediaRoutes from './media.routes.js';
import publicRoutes from './public.routes.js';
import {
  adminCommentRouter,
  articleCommentRouter,
  commentRouter,
} from './comment.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);

// Article-prefix comment routes MUST be mounted before the main /articles
// router so the public GET /articles/:id/comments isn't blocked by the
// articleRoutes router-level `authenticate` middleware.
router.use('/articles', articleCommentRouter);
router.use('/articles', articleRoutes);

router.use('/comments', commentRouter);
router.use('/admin/comments', adminCommentRouter);

router.use('/media', mediaRoutes);
router.use('/public', publicRoutes);

export default router;
