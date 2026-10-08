import mongoose from "mongoose";

const voucherSchema = mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true,
      trim: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    discount: { 
      type: Number, 
      required: true 
    },
    type: { 
      type: String, 
      required: true, 
      enum: ['fixed', 'percent', 'shipping'],
      default: 'fixed'
    },
    minOrder: { 
      type: Number, 
      default: 0 
    },
    maxUses: { 
      type: Number, 
      default: 100 
    },
    usedCount: { 
      type: Number, 
      default: 0 
    },
    startDate: { 
      type: Date, 
      default: Date.now 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  {
    timestamps: true
  }
);

const Voucher = mongoose.model('Voucher', voucherSchema);
export default Voucher;