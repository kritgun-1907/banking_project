const mongoose=require('mongoose');

function connectDB(){
    mongoose.connect(process.env.MONGO_URI,{
        useNewUrlParser:true, // This option is used to parse the connection string correctly
        useUnifiedTopology:true // This option is used to opt in to using the MongoDB driver's new connection management engine
    }).then(()=>{
        console.log("Connected to MongoDB");
    }).catch((err)=>{
        console.error("Error connecting to MongoDB",err);
        process.exit(1); // Exit the process with a failure code
    });
}

module.exports=connectDB;