// backend/models/productModel.js - PHIÊN BẢN WEB BÁN GIÀY

import mongoose from "mongoose";

const reviewSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Customer',
        },
    },
    {
        timestamps: true,
    }
);

const productSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        image: { type: String, required: true },

        // Thông tin giày
        brand: { type: String, required: true },      // Nike, Adidas, Puma...
        category: { type: String, required: true },   // Sneaker, Giày chạy bộ, Giày da, Sandal, Giày thể thao
        description: { type: String, required: true },
        color: { type: String, default: '' },
        sizes: { type: [Number], default: [] },       // các size còn bán, ví dụ [38, 39, 40, 41]

        price: { type: Number, required: true, default: 0 },

        countInStock: { type: Number, required: true, default: 0 },
        reviews: [reviewSchema],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },

        // ✅ FIELD ẨN/HIỆN SẢN PHẨM
        isHidden: {
            type: Boolean,
            default: false
        },

        // SEO
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: { type: String },
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model('Product', productSchema);
export default Product;