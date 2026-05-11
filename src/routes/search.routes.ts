import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  searchQuerySchema,
  suggestQuerySchema,
} from '../validators/search.validator.js';
import { search, suggest } from '../controllers/search.controller.js';

const router = Router();

// Define /suggest BEFORE the catch-all GET / so /search/suggest never falls
// through to the main search handler.
router.get(
  '/suggest',
  validate({ query: suggestQuerySchema }),
  asyncHandler(suggest),
);

router.get(
  '/',
  validate({ query: searchQuerySchema }),
  asyncHandler(search),
);

export default router;
