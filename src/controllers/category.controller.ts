import type { Request, Response } from 'express';
import * as categoryService from '../services/category.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, created, noContent } from '../views/apiResponse.js';
import { toCategoryDTO, toCategoryListDTO } from '../views/category.view.js';
import type {
  CreateCategoryBody,
  ListCategoriesQuery,
  SlugParam,
  UpdateCategoryBody,
} from '../validators/category.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  const { includeInactive } = requireValidated<ListCategoriesQuery>(req, 'query');
  const items = await categoryService.listCategories({ includeInactive });
  ok(res, toCategoryListDTO(items));
}

export async function getCategoryBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = requireValidated<SlugParam>(req, 'params');
  const category = await categoryService.getBySlug(slug);
  ok(res, toCategoryDTO(category));
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const body = requireValidated<CreateCategoryBody>(req, 'body');
  const category = await categoryService.create(body);
  created(res, toCategoryDTO(category), 'Category created');
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<UpdateCategoryBody>(req, 'body');
  const category = await categoryService.update(id, body);
  ok(res, toCategoryDTO(category), 'Category updated');
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await categoryService.remove(id);
  noContent(res);
}
