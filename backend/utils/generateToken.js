import jwt from 'jsonwebtoken';
const generateToken = (id)=>{
    return jwt.sign(
        {id},
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',//token het han sau 30d
        }
    );
};
export default generateToken;