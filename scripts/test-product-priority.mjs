import assert from 'node:assert/strict';
import { prioritizeTaggedProducts, groupProductsByBrand } from '../src/utils/products.js';
const rows = [
  { id: 1, name: 'A', brandId: 1 },
  { id: 2, name: 'B', brandId: 1, tag: 'шинэ' },
  { id: 3, name: 'C', brandId: 2, tag: 'бестселлэр' },
  { id: 4, name: 'D', brandId: 2, tag: 'хямдралтай', discountEndsAt: '2099-01-01' },
  { id: 5, name: 'E', brandId: 2, tag: 'хямдралтай', discountEndsAt: '2000-01-01' },
];
assert.deepEqual(prioritizeTaggedProducts(rows).map(p => p.id), [2,3,4,1,5]);
assert.deepEqual(rows.map(p => p.id), [1,2,3,4,5]);
assert.deepEqual(prioritizeTaggedProducts([...rows].reverse()).map(p => p.id), [4,3,2,5,1]);
assert.deepEqual(prioritizeTaggedProducts(groupProductsByBrand(rows, [{id:1},{id:2}])).map(p => p.id), [2,3,4,1,5]);
console.log('PASS tag priority across brands, stable secondary ordering, expired discounts and immutable input');
