import Product from '../models/productModel.js';
import { productPricing } from '../../shared/productPricing.js';
import { canRecommendProduct, consultationInventoryQuery } from '../utils/consultationInventory.js';

export const getStaffInventory = async (req, res) => {
  const { filter, page, limit } = consultationInventoryQuery(req.query);
  const [rows, total] = await Promise.all([
    Product.find(filter).select('_id name brand category style image color sizes variants countInStock isHidden isArchived price discountPercent').sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const items = rows.map(product => ({ ...product, ...productPricing(product), canRecommend: canRecommendProduct(product) }));
  res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
};
