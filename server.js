//This is the entry point of the application. It sets up the server and connects to the database.

require('dotenv').config();

const app= require('./src/app');
const connectDB=require('./src/config/db');

// Prevent the server from crashing on unhandled promise rejections
// (e.g. background email sends with invalid SMTP credentials).
process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});

// Connect to the database
connectDB();

// Start the server


app.listen(3000,()=>{
    console.log("Server is running on port 3000");
});

