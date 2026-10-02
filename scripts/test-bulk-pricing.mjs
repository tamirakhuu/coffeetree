import assert from 'node:assert/strict';
import { computeLineTotal, shapeProduct, revertExpiredDiscount } from '../src/api.js';
import { availableOptionTypes } from '../src/utils/products.js';
const sized = shapeProduct({ unit_price: 999, bulk_qty: 2, bulk_unit_price: 1, coffee_sizes: {
  size_1kg: { price: 100000, stock: 2, original_price: 120000 },
  size_250g: { price: 34000, stock: 0, original_price: 38000 },
} });
assert.deepEqual(availableOptionTypes(sized), ['size_1kg', 'size_250g']);
assert.equal(sized.size_1kg.label, '1кг');
assert.equal(sized.size_250g.stock, 0);
assert.equal(computeLineTotal(sized, 'size_1kg', 2), 200000);
assert.equal(computeLineTotal(sized, 'size_250g', 3), 102000);
assert.equal(revertExpiredDiscount({ ...sized, tag: 'хямдралтай', discountEndsAt: '2000-01-01' }).size_250g.price, 38000);
console.log('PASS independent coffee size prices, stock and expired discounts');
const p = shapeProduct({ unit_price: 16500, bulk_qty: 3, bulk_unit_price: 15000, box_price: 0 });
assert.equal(computeLineTotal(p, 'unit', 2), 33000);
assert.equal(computeLineTotal(p, 'unit', 3), 45000);
assert.equal(computeLineTotal(p, 'unit', 4), 60000);
const legacy = { ...p, bulkUnitPrice: null, box: { price: 84000, perBox: 6 } };
assert.equal(computeLineTotal(legacy, 'unit', 3), 42000);
assert.equal(computeLineTotal({ ...legacy, bulkUnitPrice: 15000 }, 'unit', 3), 45000);
assert.equal(computeLineTotal(legacy, 'box', 2), 168000);
assert.equal(computeLineTotal({ ...p, bulkQty: null }, 'unit', 3), 49500);
assert.equal(computeLineTotal({ ...p, bulkUnitPrice: null }, 'unit', 3), 49500);
const expired = revertExpiredDiscount({ ...p, tag: 'хямдралтай', discountEndsAt: '2000-01-01', unit: { price: 16000, originalPrice: 16500 } });
assert.equal(computeLineTotal(expired, 'unit', 3), 45000);
console.log('PASS unit-only bulk threshold, explicit price, legacy box fallback, box purchases and expired promotions');
