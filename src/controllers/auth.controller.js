const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const { tokenBlacklistModel } = require('../models/blacklist.model');


/**
 * - User Registration Controller
 * - Path: POST /api/auth/register
 */
async function userRegisterController(req, res) {
    // Handle user registration logic here
    //basically this tells what we will be receiving in the request body when a user tries to register. We expect to receive the name, email, and password of the user in the request body, which we will use to create a new user account in our database.
    const {name,email,password} = req.body; // Destructure the name, email, and password from the request body. This allows us to easily access these values when creating a new user.

    const isExistingUser= await user.model.findOne({email}); // This line checks if a user with the provided email already exists in the database. It uses the findOne method of the user model to search for a user document that matches the email. If a user is found, it will be stored in the isExistingUser variable.

    if(isExistingUser){ // This condition checks if the isExistingUser variable is truthy, which means that a user with the provided email already exists in the database. If this condition is true, it sends a response with a 422 status code and a message indicating that the user already exists, preventing the creation of duplicate accounts with the same email.
        return res.status(422).json({message:"User already exists"});
    }

    try{
        const newUser = await userModel.create({name,email,password}); // This line creates a new user document in the database using the create method of the user model. It takes an object with the name, email, and password as arguments. The create method will handle hashing the password before saving it to the database, thanks to the pre-save middleware defined in the user model.

        const token= jwt.sign(
            {userId: newUser._id, email: newUser.email}, 
            process.env.JWT_SECRET, 
            {expiresIn: process.env.EXPIRES_IN}
        ); // This line generates a JSON Web Token (JWT) for the newly registered user. It uses the jwt.sign method, which takes three arguments: the payload (an object containing the userId), the secret key (retrieved from environment variables), and an options object that specifies the token's expiration time (in this case, 3 days). The generated token can be used for authentication in subsequent requests to protected routes.

        res.cookie('jwt_token', token, { httpOnly: true }); // Set the JWT as a cookie in the response

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id, // MongoDB automatically creates _id When you save any document to MongoDB, it automatically generates a unique identifier field and names it _id:
                name: newUser.name,
                email: newUser.email
            },
                token: token // Include the token in the response body
        });



    }catch(err){
        res.status(500).json({message:"Server error", error:err.message}); // If an error occurs during the user creation process, this line catches the error and sends a response with a 500 status code (indicating a server error) and a JSON object containing an error message and the details of the error. This helps the client understand that something went wrong on the server side.
    }   
}

/**
 * - User Login Controller
 * - Path: POST /api/auth/login
 */
async function userLoginController(req, res) {
    // Handle user login logic here
    const {email,password} = req.body; // Destructure the email and password from the request body. This allows us to easily access these values when attempting to authenticate the user.

    //We will first check if a user with the provided email exists in the database. If no user is found, we will return a 401 Unauthorized response with a message indicating that the credentials are invalid. If a user is found, we will then compare the provided password with the hashed password stored in the database using the comparePassword method defined in the user model. If the passwords do not match, we will again return a 401 Unauthorized response. If the passwords match, we will generate a JWT for the authenticated user and send it back in the response, along with a success message and some user information (excluding sensitive data like the password). This allows the client to use the token for subsequent authenticated requests to protected routes in our application.
    const user = await userModel.findOne({email}).select('+password'); // This line attempts to find a user document in the database that matches the provided email. It uses the findOne method of the user model, and the select('+password') part is used to include the password field in the query result, as it is excluded by default in the user schema for security reasons.

    if(!user){ // This condition checks if the user variable is falsy, which means that no user with the provided email was found in the database. If this condition is true, it sends a response with a 401 status code (indicating unauthorized access) and a message indicating that the credentials are invalid, preventing unauthorized login attempts.
        return res.status(401).json({message:"Email not found"});
    }

    const isValidPassword = await user.comparePassword(password); // This line uses the comparePassword method defined in the user model to compare the provided password with the hashed password stored in the user document. It returns true if the passwords match and false if they do not.

    if(!isValidPassword){ // This condition checks if the isValidPassword variable is falsy, which means that the provided password does not match the hashed password stored in the database. If this condition is true, it sends a response with a 401 status code and a message indicating that the credentials are invalid, preventing unauthorized access even if the email is correct.
        return res.status(401).json({message:"Password is incorrect"});
    }

    const token= jwt.sign(
        {userId: user._id, email: user.email}, //payload of the token, which includes the userId and email of the authenticated user. This information can be used to identify the user in subsequent requests when the token is sent back to the server for authentication.
        process.env.JWT_SECRET, 
        {expiresIn: process.env.EXPIRES_IN}
    ); // If the credentials are valid, this line generates a JSON Web Token (JWT) for the authenticated user. It uses the jwt.sign method, which takes three arguments: the payload (an object containing the userId and email), the secret key (retrieved from environment variables), and an options object that specifies the token's expiration time.

    res.cookie('jwt_token', token, { httpOnly: true }); // Set the JWT as a cookie in the response

    res.status(200).json({
        message: "User logged in successfully",
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        },
        token: token // Include the token in the response body
    }); // Finally, this line sends a response with a 200 status code (indicating success) and a JSON object containing a success message, some user information (excluding the password), and the generated JWT token. This allows the client to use the token for subsequent authenticated requests to protected routes in our application.

    await emailService.sendRegistrationEmail(user.email, user.name); // This line calls the sendRegistrationEmail function from the emailService module, passing in the user's email and name as arguments. This function is responsible for sending a welcome email to the user after they have successfully logged in. The email will contain a personalized message welcoming the user to the application and thanking them for logging in.
}

/**
 * - User Logout Controller
 * - This controller handles user logout requests.
 */
async function userLogoutController(req, res) {
    const token= req.cookies.token || req.headers.authorization?.split(" ")[1]; // Extract the token from cookies or Authorization header and .split the header to get the token part if it exists.
    
    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing" }); // If no token is found, return a 401 Unauthorized response with a message indicating that the authentication token is missing.
    }
    
    await tokenBlacklistModel.create({ token }); // Add the token to the blacklist

    res.clearCookie("jwt_token"); // Clear the JWT cookie

    res.status(200).json({ message: "User logged out successfully" });
}

module.exports={
    userRegisterController,
    userLoginController,
    userLogoutController
}



// The client (frontend) would receive something like:
// json{
//     "message": "User registered successfully",
//     "user": {
//         "_id": "664abc123...",
//         "name": "John",
//         "email": "john@example.com"
//     }
// }