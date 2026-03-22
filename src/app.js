// This file is the entry point of the src. It instantiates the Express server and exports it for use in other parts of the application.
//and secondly configs the middlewares being used in the application. The main purpose of this file is to set up the Express application and define the routes that will be used to handle incoming HTTP requests.

const express= require('express'); //we are using commonjs syntax to import the express module, which is a popular web framework for Node.js. This allows us to create an instance of an Express application and define routes and middleware for handling HTTP requests in our application.
const app=express();
const cookieParser = require('cookie-parser'); // This line imports the cookie-parser middleware, which is used to parse cookies in incoming HTTP requests. It allows us to easily access and manipulate cookies in our Express application.


app.use('/api/auth',authRouter); // Mount the auth router at the /api/auth path
//basically any request that starts with /api/auth will be handled by the authRouter, which is defined in the src/routes/auth.routes.js file. This allows us to organize our routes and keep our code modular.

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cookieParser()); // Middleware to parse cookies in incoming requests

/**
 * -ROUTES required
 */
const authRouter=require('./routes/auth.routes');
const accountRouter=require('./routes/account.routes');
const transactionRouter=require('./routes/transaction.routes');

/**
 * -USE ROUTES using routes
 */
app.get("/",(req,res)=>{
    res.send("Welcome to the Banking API");
}); // This line defines a route for handling GET requests to the root path ("/"). When a request is made to this endpoint, it sends a simple welcome message as the response. This can serve as a basic health check or landing page for the API.

app.use("/api/auth", authRouter); // Mount the auth router at the /api/auth path
app.use("/api/account", accountRouter); // Mount the account router at the /api/account path
app.use("/api/transactions", transactionRouter); // Mount the transaction router at the /api/transactions path

module.exports=app;