import { cleanText, httpError, normalizeSize, nonNegativeInteger } from './validation.js';
import { hasProductVariants } from './productVariants.js';

const escaped = value => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
export const canRecommendProduct = product => Boolean(product && !product.isHidden && !product.isArchived && product.countInStock > 0
  && (!hasProductVariants(product) || product.variants.some(row => row.quantity > 0)));

// Decimal arithmetic matches productPricing's half-up discount rounding, even
// for large safe VND integers. Filtering uses the actual discounted sale price.
const salePrice = {
  $subtract: [{ $toDecimal: '$price' }, { $floor: { $divide: [
    { $add: [{ $multiply: [{ $toDecimal: '$price' }, { $toDecimal: { $ifNull: ['$discountPercent', 0] } }] }, 50] }, 100],
  } }],
};
export const consultationInventoryQuery = query => {
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw httpError(400, 'Trang không hợp lệ');
  const filter = { isArchived: { $ne: true } }, conditions = [];
  const text = key => query[key] === undefined || query[key] === '' ? '' : cleanText(query[key], 'Bộ lọc sản phẩm', { max: 100 });
  const search = text('search'), category = text('category'), color = text('color');
  const size = query.size === undefined || query.size === '' ? undefined : normalizeSize(query.size);
  const flag = query.recommendable;
  if (flag !== undefined && !['true', 'false', true, false].includes(flag)) throw httpError(400, 'Bộ lọc còn hàng không hợp lệ');
  const recommendable = flag === true || flag === 'true';
  if (search) conditions.push({ $or: ['name', 'brand', 'category', 'style'].map(field => ({ [field]: { $regex: escaped(search), $options: 'i' } })) });
  if (category) filter.category = { $regex: '^' + escaped(category) + '$', $options: 'i' };
  if (recommendable) { filter.isHidden = { $ne: true }; filter.countInStock = { $gt: 0 }; }
  if (recommendable || size !== undefined || color) {
    const variant = { ...(recommendable ? { quantity: { $gt: 0 } } : {}), ...(size !== undefined ? { size } : {}), ...(color ? { color: { $regex: escaped(color), $options: 'i' } } : {}) };
    conditions.push({ $or: [
      { variants: { $elemMatch: variant } },
      { 'variants.0': { $exists: false }, ...(size !== undefined ? { sizes: size } : {}), ...(color ? { color: { $regex: escaped(color), $options: 'i' } } : {}) },
    ] });
  }
  const min = query.minPrice === undefined || query.minPrice === '' ? undefined : nonNegativeInteger(query.minPrice, 'Giá thấp nhất');
  const max = query.maxPrice === undefined || query.maxPrice === '' ? undefined : nonNegativeInteger(query.maxPrice, 'Giá cao nhất');
  if (min !== undefined && max !== undefined && min > max) throw httpError(400, 'Giá thấp nhất không được vượt giá cao nhất');
  if (min !== undefined || max !== undefined) filter.$expr = { $and: [...(min !== undefined ? [{ $gte: [salePrice, min] }] : []), ...(max !== undefined ? [{ $lte: [salePrice, max] }] : [])] };
  if (conditions.length) filter.$and = conditions;
  return { filter, page, limit: 30 };
};
