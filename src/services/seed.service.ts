import * as categoryModel from '../models/category.model.js';
import { makeSlug } from '../utils/slug.js';
import { logger } from '../utils/logger.js';

const DEFAULT_CATEGORIES: Array<{ name: string; description: string }> = [
  { name: 'National', description: 'Domestic news and stories from around the country' },
  { name: 'Politics', description: 'Government, elections, and policy coverage' },
  { name: 'International', description: 'Global affairs and international affairs' },
  { name: 'Business', description: 'Markets, finance, and the economy' },
  { name: 'Sports', description: 'Local and international sports news' },
  { name: 'Entertainment', description: 'Movies, music, celebrities, and culture' },
  { name: 'Technology', description: 'Latest in tech, gadgets, and innovation' },
  { name: 'Lifestyle', description: 'Travel, food, fashion, and living' },
  { name: 'Health', description: 'Wellness, medicine, and public health' },
  { name: 'Education', description: 'Schools, universities, and learning' },
];

export async function seedDefaultCategories(): Promise<void> {
  const existing = await categoryModel.countAll();
  if (existing > 0) {
    logger.debug({ existing }, 'Categories already seeded; skipping');
    return;
  }

  let order = 1;
  for (const def of DEFAULT_CATEGORIES) {
    await categoryModel.createCategory({
      name: def.name,
      slug: makeSlug(def.name),
      description: def.description,
      order,
      isActive: true,
    });
    order++;
  }

  logger.info(
    { count: DEFAULT_CATEGORIES.length },
    'Default categories seeded',
  );
}
