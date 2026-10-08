import mongoose from "mongoose";
import bcrypt from "bcryptjs";

//tao schema cho gio hang
const cartItemSchema = mongoose.Schema({
    name: {type: String, required: true},
    quantity: { type: Number, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product',
    },
});

const customerSchema = mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: false },
    phone: { type: String, required: false },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    cart: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);


customerSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }
    

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

    } catch (error) {

        throw new Error(error);
    }
});


customerSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false; 
    return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;