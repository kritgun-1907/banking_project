//This is the entry point of the application. It sets up the server and connects to the database.

require('dotenv').config(); // Load environment variables from .env file .config() is a method provided by the dotenv package that reads the .env file and loads the environment variables into process.env, making them accessible throughout the application.

const app= require('./src/app');
const connectDB=require('./src/config/db');

// Connect to the database
connectDB();

// Start the server


app.listen(3000,()=>{
    console.log("Server is running on port 3000");
});

