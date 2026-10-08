import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { hashPassword } from "../utils/hashPassword.js";

const staffSchema = mongoose.Schema(
    {
        email: {type: String, required: true, unique: true},
        name: {type: String, required: false},
        phone: {type: String, required: false},
        password: {type: String, required: true},
        role: {type: String},
        salary: {type: mongoose.Decimal128},
        hireDate: {type: Date, default: Date.now},
        isAdmin: {type: Boolean, default: false},
    }
);
staffSchema.pre("save", async function(next){
    if(!this.isModified("password")){return next();}

    this.password= await hashPassword(this.password);
    next();
});

//ham matchPasword
staffSchema.methods.matchPassword = async function (enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
};
const Staff = mongoose.model("Staff", staffSchema, "staff");
export default Staff;