const mongoose=require('mongoose');

function connectDB(){
    // NOTE: useNewUrlParser and useUnifiedTopology were removed in Mongoose 6+ / MongoDB Driver 4+.
    // Passing them now throws MongoParseError. mongoose.connect() needs no extra options.
    mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log("Connected to MongoDB");
    }).catch((err)=>{
        console.error("Error connecting to MongoDB",err);
        process.exit(1); // Exit the process with a failure code
    });
}

module.exports=connectDB;