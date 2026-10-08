import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
    {
        //tham chieu den nguoi dung dat hang
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Customer', //tham chieu den 'Customer' model
        },

        // arr chua cac san pham da mua
        orderItems: [
            {
                name: { type: String, required: true },
                quantity: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: 'Product',
                },
            },
        ],

        //thong tin giao hang
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            phone: { type: String, required: true },
        },

        //thong tin thanh toan
        paymentMethod: {
            type: String,
            required: true,
            default: 'COD',
        },

        //gia tri don hang
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },

        //trang thai don hang
        orderStatus: {
            type: String,
            required: true,
            default: 'Đang xử lý',
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        isDelivered: {
            type: Boolean,
            required: true,
            default: false,
        },
        deliveredAt: {
            type: Date,
        },

    },
    {
        timestamps: true,
    }
);
const Order = mongoose.model('Order', orderSchema);
export default Order;