import assert from 'node:assert/strict';
import { groupProductsByBrand, compareProductNames } from '../src/utils/products.js';

const products = [
  { id: 1, brandId: 2, name: 'Vanilla' },
  { id: 2, brandId: 1, name: 'apple' },
  { id: 3, brandId: 2, name: 'Caramel', tag: 'бестселлэр' },
  { id: 4, brandId: 1, name: 'Zebra', tag: 'хямдралтай' },
  { id: 5, brandId: 2, name: 'banana' },
  { id: 6, brandId: null },
  { id: 7, brandId: 99 },
  { id: 8, brandId: null },
];
const before = structuredClone(products);
assert.deepEqual(groupProductsByBrand(products, [{ id: 1 }, { id: 2 }]).map(p => p.id), [2, 4, 5, 3, 1, 6, 8, 7]);
assert.deepEqual([{ name: 'Size 10' }, { name: 'size 2' }, { name: ' Apple' }].sort(compareProductNames).map(p => p.name), [' Apple', 'size 2', 'Size 10']);
assert.deepEqual(products, before);
assert.deepEqual(groupProductsByBrand([], []), []);
console.log('PASS brand grouping, A-Z names, natural numeric order and unchanged source data');
