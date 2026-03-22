const express= require('express');
const authController = require('../controllers/auth.controller'); // This line imports the userRegisterController function from the auth.controller.js file located in the controllers directory.

const router = express.Router(); // This line creates a new router instance using the Router factory method provided by the Express framework. The router instance is used to define routes for handling HTTP requests in a modular way. By using a router, we can group related routes together and keep our code organized, especially as our application grows in complexity.

/**  
 * - Register a new user 
 * - POST /api/auth/register
 */ //-- this comment style is known as JSDoc style, which is commonly used for documenting JavaScript code. It provides a clear and structured way to describe the purpose and functionality of the code that follows it. In this case, the comment indicates that the following route handler is responsible for registering a new user.
router.post('/register', authController.userRegisterController);

/**
 * - Login a user
 * - POST /api/auth/login
 */
router.post('/login', authController.userLoginController); // This line defines a route for handling POST requests to the /login endpoint. It uses the post method of the router instance to specify that this route should only respond to POST requests. The second argument is the userLoginController function imported from the auth.controller.js file, which will be executed when a request is made to this endpoint. This route is responsible for handling user login functionality, allowing users to authenticate themselves and receive a token for accessing protected routes in the application.

/**
 * - Logout a user
 * - POST /api/auth/logout
 */
router.post('/logout', authController.userLogoutController); // This line defines a route for handling POST requests to the /logout endpoint. It uses the post method of the router instance to specify that this route should only respond to POST requests. The second argument is the userLogoutController function imported from the auth.controller.js file, which will be executed when a request is made to this endpoint. This route is responsible for handling user logout functionality, allowing users to invalidate their authentication token and effectively log out of the application.
 


module.exports=router; // This line exports the router instance, making it available for import in other files. By exporting the router, we can use it to define routes in this file and then mount it in our main application file (src/app.js) to handle requests that match the specified path.
