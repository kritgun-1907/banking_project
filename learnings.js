// lexical scoping vs dynamic scoping 
// lexical scoping is when the scope of a variable is determined by its position in the source code. In this case, the variable is accessible only within the block of code where it is defined and any nested blocks. For example:

function outer() {
    let x = 10; // x is defined in the outer function
    function inner() {
        console.log(x); // inner function can access x because of lexical scoping
    }
    inner();
}
outer(); // Output: 10

// Dynamic scoping, on the other hand, is when the scope of a variable is determined by the call stack at runtime. In this case, the variable is accessible to any function that is called after it is defined, regardless of where it is defined in the source code. For example:

function outer() {
    let x = 10; // x is defined in the outer function
    function inner() {
        console.log(x); // inner function can access x because of dynamic scoping           
    }
    inner();
}
outer(); // Output: 10

// In JavaScript, we have lexical scoping, which means that the scope of a variable is determined by its position in the source code. Dynamic scoping is not supported in JavaScript.

//differentiating example between lexical and dynamic scoping would be:

function outer() {
    let x = 10; // x is defined in the outer function
    function inner() {
        console.log(x); // inner function can access x because of lexical scoping
    }
    return inner;
}

const innerFunction = outer(); // innerFunction is returned from outer
innerFunction(); // Output: 10, because of lexical scoping

function dynamicOuter() {
    let x = 20; // x is defined in the dynamicOuter function
    function dynamicInner() {
        console.log(x); // dynamicInner can access x because of dynamic scoping
    }
    return dynamicInner;
}

const dynamicInnerFunction = dynamicOuter(); // dynamicInnerFunction is returned from dynamicOuter
dynamicInnerFunction(); // Output: 20, because of dynamic scoping

// In the first example, the inner function can access the variable x because of lexical scoping, as it is defined within the outer function. In the second example, the inner function can access the variable x because of dynamic scoping, as it is called after the variable is defined in the dynamicOuter function.   

//for eg arrow functions do not have their own this context, they inherit it from the enclosing scope, which is an example of lexical scoping. In contrast, regular functions have their own this context, which is determined by how they are called, demonstrating dynamic scoping.
//in simpler terms, context in arrow functions means that they do not have their own this value, and instead, they use the this value of the surrounding code. This is because arrow functions are designed to be more concise and do not have their own scope for this. Regular functions, on the other hand, have their own this value that is determined by how they are called, which can lead to different behavior depending on the context in which they are used.


// The isModified Guard
// if (!this.isModified('password')) return next();
// Without this check, every time you update a user's name or email, the already-hashed password would get hashed again, making it permanently unverifiable. This single line prevents a silent, catastrophic bug.


// select: false is an example of "Secure by Default" — a core security principle.

// Instead of relying on developers to always do the right thing, you make the safe behavior automatic and the dangerous behavior require extra effort.

// You'll use this same pattern for other sensitive fields too:
// javascript// Other fields you'd protect the same way
// resetPasswordToken: { type: String, select: false },
// twoFactorSecret:    { type: String, select: false },
// socialSecurityNum:  { type: String, select: false },
// creditCardHash:     { type: String, select: false },


// The Two Scenarios
// Scenario 1 — Normal Usage (Profile page, dashboard, etc.)
//  You just want to show user info
// const user = await User.findById(id);
// res.json(user);

// Password is automatically excluded ✅
// // Safe to send to frontend ✅
// // No extra effort needed ✅
// Scenario 2 — Login (You NEED the password to verify)
// // You explicitly opt-in to getting the password
// const user = await User.findOne({ email }).select('+password');
// //                                         👆
// //                              The + means "add this back in"

// // Now you have the password hash to compare
// const isMatch = await user.comparePassword(req.body.password);




// Code Explanation
// Syntactic Analysis (Structure & Grammar)
// const express = require('express');

// const — keyword declaring a block-scoped, non-reassignable variable
// express — the identifier (variable name)
// require('express') — a CommonJS function call that loads the express module from node_modules

// const router = express.Router();

// express.Router() — calling the Router factory method on the express object
// Returns a mini-application capable of handling routes
// router — stores that router instance

// module.exports = router;

// module — a built-in CommonJS object representing the current file
// .exports — the property that defines what this file exposes to other files
// = router — assigns the router as the exported value


// Semantic Analysis (Meaning & Purpose)
// What this code means at a higher level:

// Import Express → get access to the framework
// Create a Router → a router is like a mini Express app — it holds a group of related routes (e.g. all /user routes) and keeps your code modular
// Export the Router → so another file (usually app.js) can require() it and mount it onto the main app

// The router itself is empty here — no routes are defined between creation and export. Routes like router.get(...) or router.post(...) would go in the middle.

// CommonJS vs ES Modules
// FeatureCommonJS (CJS)ES Modules (ESM)Syntax to importrequire()importSyntax to exportmodule.exports =export / export defaultWhen it loadsRuntime (dynamic)Parse time (static)File extension.js (default in Node).mjs or "type":"module" in package.jsonCan be conditional?✅ Yes — if(x) require(...)❌ No — imports are always top-levelUsed inNode.js (traditional)Browsers + Modern Node.jsDefault in Node.js?✅ Yes❌ Needs opt-in
// Same code in ES Module style:
// // ESM equivalents

// import express from 'express';          // instead of require()

// const router = express.Router();

// export default router;                  // instead of module.exports
// Key Conceptual Difference
// CommonJS loads modules lazily at runtime — require() is just a function call that can appear anywhere, even inside an if block.
// ESM is statically analyzed at parse time — the JS engine knows all imports/exports before any code runs, which enables tree-shaking and better optimization.

// In modern Node.js projects (especially with frameworks like Next.js or using TypeScript), ESM is preferred. But in classic Express apps, CommonJS is still the standard default.





// Why call sendEmail inside sendRegistrationEmail?
// This is a Separation of Concerns design pattern. Let me break it down clearly.

// Each function has ONE job
// javascript// JOB: Just knows HOW to send any email
// // Generic, reusable, knows nothing about registration
// const sendEmail = async (to, subject, text, html) => {
//     // talks to nodemailer
//     // handles transport
//     // logs message id
// }

// // JOB: Just knows WHAT to send for registration
// // Specific, knows the welcome message content
// async function sendRegistrationEmail(userEmail, name) {
//     // builds the registration-specific content
//     // then DELEGATES the actual sending to sendEmail
// }

// ### Think of it like this real world analogy
// ```
// sendEmail            =   A DELIVERY TRUCK 🚚
//                          doesn't care what's inside
//                          just delivers whatever you give it

// sendRegistrationEmail =  THE PERSON WHO PACKS THE BOX 📦
//                          knows exactly what goes inside
//                          then hands it to the truck to deliver

// What if you did NOT separate them?
// You would end up repeating the nodemailer logic everywhere:
// javascript// ❌ BAD — repeated nodemailer code everywhere
// async function sendRegistrationEmail(userEmail, name) {
//     await transporter.sendMail({
//         from: `"KTG-LEDGER" <${process.env.EMAIL_USER}>`,
//         to: userEmail,
//         subject: 'Welcome to KTG-LEDGER',
//         // nodemailer logic repeated here...
//     });
// }

// async function sendPasswordResetEmail(userEmail) {
//     await transporter.sendMail({
//         from: `"KTG-LEDGER" <${process.env.EMAIL_USER}>`,
//         to: userEmail,
//         subject: 'Reset Your Password',
//         // nodemailer logic repeated AGAIN...
//     });
// }

// async function sendInvoiceEmail(userEmail) {
//     await transporter.sendMail({
//         from: `"KTG-LEDGER" <${process.env.EMAIL_USER}>`,
//         to: userEmail,
//         subject: 'Your Invoice',
//         // nodemailer logic repeated AGAIN...
//     });
// }

// With separation — clean and reusable ✅
//  ✅ GOOD — sendEmail written once, reused everywhere
// async function sendRegistrationEmail(userEmail, name) {
//     const subject = 'Welcome to KTG-LEDGER';
//     const text = `Hello ${name}...`;
//     const html = `<p>Hello ${name}...</p>`;
//     await sendEmail(userEmail, subject, text, html); // ← reusing
// }

// async function sendPasswordResetEmail(userEmail, resetLink) {
//     const subject = 'Reset Your Password';
//     const text = `Click here: ${resetLink}`;
//     const html = `<a href="${resetLink}">Reset Password</a>`;
//     await sendEmail(userEmail, subject, text, html); // ← same sendEmail reused
// }

// async function sendInvoiceEmail(userEmail, invoiceData) {
//     const subject = 'Your Invoice';
//     const text = `Invoice total: ${invoiceData.total}`;
//     const html = `<p>Invoice: <strong>${invoiceData.total}</strong></p>`;
//     await sendEmail(userEmail, subject, text, html); // ← same sendEmail reused
// }
// ```

// ---

// ### The relationship visualized
// ```
// controller.js
//      |
//      |  calls
//      ↓
// sendRegistrationEmail(userEmail, name)   ← knows WHAT content to send
//      |
//      |  calls
//      ↓
// sendEmail(to, subject, text, html)       ← knows HOW to send it
//      |
//      |  calls
//      ↓
// transporter.sendMail(...)                ← actually sends it

// Simple rule to remember
// If you ever find yourself writing the same code in multiple places — extract it into its own function and just call that function wherever needed.
// sendEmail is that extracted function — write the transport logic once, call it forever. Sonnet 4.6



// What is a Session in MongoDB?
// A session in MongoDB is a container that tracks a sequence of operations as a single logical unit of work. Think of it like opening a "work context" — MongoDB uses it to maintain state across multiple operations so they can be tracked, coordinated, and optionally rolled back together.
// Without a session, every operation you fire is completely independent — MongoDB has no idea that your insertOne and your updateOne are related to each other. A session tells MongoDB: "these operations belong together."
// What a session gives you
// Causal consistency — operations within a session are guaranteed to respect the order you issued them. If you write something, a subsequent read in the same session will always see that write, even across replica set members.
// Transaction support — sessions are the prerequisite for multi-document transactions. You cannot start a transaction without a session.
// Cluster time tracking — MongoDB uses the session to track logical time (clusterTime) so it can enforce consistency guarantees.

// What is session.startTransaction()?
// By default, every single MongoDB operation (insert, update, delete) is auto-committed — it executes and persists immediately, atomically, on its own. There is no way to roll it back.
// session.startTransaction() changes that. It tells MongoDB: "hold all the operations I'm about to run — don't commit any of them to disk yet. Wait for my explicit commit signal. And if anything goes wrong, throw everything away."
// This is exactly like a database transaction in SQL — all or nothing.Here is the classic real-world example that makes transactions click — a bank transfer. Without a transaction, if your code crashes between the debit and the credit, money vanishes from one account and never arrives in the other.
//   ::view-transition-group(*),
//   ::view-transition-old(*),
//   ::view-transition-new(*) {
//     animation-duration: 0.25s;
//     animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
//   }
// VvisualizeVvisualize show_widget
// The three key concepts inside a transaction
// Atomicity — all operations in the transaction either all succeed and commit, or all fail and get rolled back. There is no partial state.
// Isolation — while your transaction is running, other clients reading the database will not see your uncommitted writes. They see the last committed state. Your changes only become visible to others after commitTransaction().
// Durability — once commitTransaction() returns successfully, those writes are permanently on disk across all replica set members.