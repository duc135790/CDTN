import mongoose from "mongoose";

export const connectDB = async () => {
    try{
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ Mongo connected : ${conn.connection.host}`);
        console.log(`✅ Database name: ${conn.connection.name}`);
        return true;
    }catch(error){
        console.error(`❌ MongoDB Connection ERROR: ${error.message}`);
        
        // Provide more helpful error messages
        if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
            console.error('🔐 Authentication failed. Please check:');
            console.error('   1. MongoDB username and password in MONGO_URI');
            console.error('   2. Database user has proper permissions');
            console.error('   3. IP address is whitelisted in MongoDB Atlas (if using Atlas)');
            console.error(`   Current MONGO_URI: ${process.env.MONGO_URI ? '***' + process.env.MONGO_URI.slice(-20) : 'not set'}`);
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.error('🌐 Connection error. Please check:');
            console.error('   1. Internet connection');
            console.error('   2. MongoDB server is running');
            console.error('   3. MongoDB Atlas cluster is running (if using Atlas)');
        }
        
        console.warn('⚠️  Server will continue to start, but database features will not work.');
        console.warn('⚠️  Please fix MongoDB connection and restart the server.');
        return false;
    }
}