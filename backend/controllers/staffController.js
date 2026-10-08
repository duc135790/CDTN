import Staff from "../models/staffModel.js";
import generateToken from "../utils/generateToken.js";
//@desc dang ky nhan vien moi
//@route POST/api/staff
const registerStaff = async (req, res)=>{
    const {email, password, name, phone, role}= req.body;

    try{
        const staffExists = await Staff.findOne({email});
        if(staffExists){
            return res.status(400).json({message : "Nhan vien da ton tai"});
        }

        //tao staff
        const staff = await Staff.create({
            email,
            password,
            name,
            phone,
            role,
        });

        res.status(201).json({
            _id: staff._id,
            name: staff.name,
            email: staff.email,
            isAdmin: staff.isAdmin,
            token: generateToken(staff._id)
        });
    }catch(error){
        res.status(400).json({message: "Du lieu khong hop le", error: error.message});
    }
};

//@desc dang nhap nhan vien
//@route POST/api/staff/login
const loginStaff = async(req, res)=>{
    const {email, password}=  req.body;

    try{
        const staff = await Staff.findOne({email});

        if(staff && (await staff.matchPassword(password))){
            res.json({
                _id: staff._id,
                name: staff.name,
                email: staff.email,
                isAdmin: staff.isAdmin,
                token: generateToken(staff._id),
            });
        }else{
            res.status(401).json({message: "Email hoac mat khau khong chinh xac"});
        }
    }catch(error){
        res.status(500).json({message: "Loi may chu"});
    }
};
export {registerStaff, loginStaff};