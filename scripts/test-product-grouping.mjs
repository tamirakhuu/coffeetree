import assert from 'node:assert/strict';
import { groupProductsByBrand } from '../src/utils/products.js';

const products = [
  { id: 1, brandId: 2 },
  { id: 2, brandId: 1 },
  { id: 3, brandId: 2, tag: 'бестселлэр' },
  { id: 4, brandId: 1, tag: 'хямдралтай' },
  { id: 5, brandId: 2 },
  { id: 6, brandId: null },
  { id: 7, brandId: 99 },
  { id: 8, brandId: null },
];
const before = structuredClone(products);
assert.deepEqual(groupProductsByBrand(products, [{ id: 1 }, { id: 2 }]).map(p => p.id), [4, 2, 3, 1, 5, 6, 8, 7]);
assert.deepEqual(products, before);
assert.deepEqual(groupProductsByBrand([], []), []);
console.log('PASS brand grouping, featured order within brands, unknown brands and unchanged source data');
