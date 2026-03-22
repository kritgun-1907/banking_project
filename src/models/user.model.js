const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true, "Email is required"],
        unique:[true, "Email already exists"],
        match:[/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"], //regex pattern to validate email format- here ^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$ is a regular expression pattern that is used to validate the format of an email address. It checks for the following components in the email address:
        // ^\w+ - This part matches the beginning of the email address and ensures that it starts with one or more word characters (letters, digits, or underscores).
        // ([\.-]?\w+)* - This part allows for optional occurrences of a dot (.) or a hyphen (-) followed by one or more word characters. It can occur zero or more times, allowing for email addresses with multiple dots or hyphens in the local part.
        // @ - This part matches the "@" symbol that separates the local part from the domain part of the email address.
        // \w+ - This part matches one or more word characters in the domain name.
        // ([\.-]?\w+)* - Similar to the previous occurrence, this allows for optional occurrences of a dot or a hyphen followed by one or more word characters in the domain name.
        // (\.\w{2,3})+ - This part matches a dot followed by 2 to 3 word characters, which represents the top-level domain (TLD) of the email address. The + at the end allows for multiple occurrences of this pattern, accommodating email addresses with multiple TLDs (e.g., .co.uk).
        trim:true, // This option is used to remove whitespace from the beginning and end of the email string before saving it to the database
        lowercase:true // This option is used to convert the email string to lowercase before saving it to the database, ensuring that email addresses are stored in a consistent format and preventing case sensitivity issues when querying the database.
    },
    name:{
        type:String,
        required:[true, "Name is required for creating an account"],
        trim:true, // This option is used to remove whitespace from the beginning and end of the name string before saving it to the database
    },
    password:{
        type:String,
        required:[true, "Password is required for creating an account"],
        minlength:[6, "Password must be at least 6 characters long"],
        select:false // This option is used to exclude the password field from query results by default, enhancing security by preventing the password from being exposed when retrieving user data from the database. To include the password in a query result, you would need to explicitly select it using .select('+password') in your query.
    },
    systemUser:{
        type:Boolean,
        default:false, // This field is used to indicate whether a user is a system user (e.g., an admin or a service account) or a regular user. By default, it is set to false, meaning that new users will be considered regular users unless explicitly marked as system users.
        immutable:true, // This option is used to make the systemUser field immutable, meaning that once it is set for a user document, it cannot be changed. This ensures that the role of a user (system user or regular user) remains consistent throughout their lifecycle in the application and prevents unauthorized changes to user roles.
        select:false // This option is used to exclude the systemUser field from query results by default, enhancing security by preventing the role of a user from being exposed when retrieving user data from the database. To include the systemUser field in a query result, you would need to explicitly select it using .select('+systemUser') in your query.
    },
    timestamps:true // This option is used to automatically add createdAt and updatedAt fields to the schema, which will store the timestamps for when a document is created and last updated, respectively. This can be useful for tracking when user accounts are created and modified.
});

userSchema.pre('save', async function(next){ // This line defines a pre-save middleware function for the userSchema. The 'save' hook is triggered before a document is saved to the database. The function is asynchronous, allowing for the use of await within it, and it takes next as an argument, which is a callback function that should be called to proceed to the next middleware or to save the document after the current middleware has completed its operations.
    if(!this.isModified('password')){ // This condition checks if the password field has been modified. If it hasn't been modified, it calls next() to skip the password hashing process and proceed to save the document. This is important because we only want to hash the password when it is first created or when it is updated, not every time the document is saved.
        return next();
    }
    try{
        const salt = await bcrypt.genSalt(10); // This line generates a salt using bcrypt's genSalt method with a cost factor of 10. The salt is a random string that is used to enhance the security of the hashed password by adding randomness to it, making it more resistant to attacks such as rainbow table attacks.
        this.password = await bcrypt.hash(this.password, salt); // This line hashes the user's password using bcrypt's hash method, which takes the plain text password and the generated salt as arguments. The resulting hashed password is then stored in the password field of the user document. This ensures that the user's password is securely stored in the database, as it is not stored in plain text and is instead transformed into a hash that is difficult to reverse-engineer.
        next(); // This line calls next() to proceed to the next middleware function or to save the document after the password has been hashed.
    }catch(err){
        next(err); // If an error occurs during the password hashing process, this line will pass the error to the next middleware function for handling.
    }
}); 

userSchema.methods.comparePassword = async function(password){ // This line defines an instance method called comparePassword on the userSchema. This method takes a candidatePassword as an argument, which is the plain text password that needs to be compared with the hashed password stored in the database. The method is asynchronous, allowing for the use of await within it.
    try{
        return await bcrypt.compare(password, this.password); // This line uses bcrypt's compare method to compare the candidatePassword with the hashed password stored in the user document. If the passwords match, it returns true; otherwise, it returns false.
    }catch(err){
        throw new Error('Password didn\'t match'); // If an error occurs during the password comparison process, this line throws a new error with a descriptive message.
    }
};

const userModel = mongoose.model('user', userSchema);
module.exports = userModel;

