const mongoose = require('mongoose');
// ⚠️ FIX: package.json installs 'bcryptjs' (the pure-JS version), not 'bcrypt' (native C++ addon).
// Using require('bcrypt') causes a MODULE_NOT_FOUND crash at startup.
const bcrypt = require('bcryptjs');

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
        default:false,
        immutable:true,
        select:false
    },
    // ── Account Lockout Fields ────────────────────────────────────────────────
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false // excluded from normal queries; must use .select('+failedLoginAttempts')
    },
    lockUntil: {
        type: Date,
        select: false // excluded from normal queries; must use .select('+lockUntil')
    },
}, {
    timestamps: true // Schema option: automatically adds createdAt and updatedAt fields to every document. Must be passed as the second argument to mongoose.Schema(), NOT as a field inside the schema definition.
});

userSchema.pre('save', async function(){
    // In Mongoose 7+/9+, async pre-hooks do NOT receive a `next` callback.
    // Simply return early or throw — Mongoose handles the rest.
    if(!this.isModified('password')){
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
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

