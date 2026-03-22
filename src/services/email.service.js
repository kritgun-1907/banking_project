require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({ // This line creates a transporter object using the nodemailer.createTransport() method. The transporter is configured to use Gmail as the email service and OAuth2 for authentication. The authentication details (user, clientId, clientSecret, refreshToken) are retrieved from environment variables, which should be set in a .env file or in the environment where the application is running. This transporter will be used to send emails from the specified Gmail account.
    //transporter is an object which interacts with the smtp server and is responsible for sending the email. We create a transporter using the createTransport method provided by nodemailer, and we pass in an object that contains the configuration for the email service we want to use (in this case, Gmail) and the authentication details required to access that service. The authentication details include the user email, client ID, client secret, and refresh token, which are all stored in environment variables for security reasons. This allows us to securely send emails from our application without hardcoding sensitive information in our code.
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Attach an error listener so unhandled 'error' events on the transport
// stream don't crash the process (Node.js kills on unhandled EventEmitter errors).
transporter.on('error', (err) => {
  console.error('[Email transporter error]', err.message);
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// NOTE: This early `module.exports = transporter` is overwritten by the final
// module.exports at the bottom of this file. Kept for reference but has no effect.


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"KTG-LEDGER" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

/**
 * Sends a welcome/registration confirmation email to a newly registered user.
 *
 * @async
 * @function sendRegistrationEmail
 * @param {string} userEmail - The email address of the newly registered user.
 * @param {string} name - The full name of the newly registered user.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendRegistrationEmail('john@example.com', 'John Doe');
 */
async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to KTG-LEDGER';
  const text = `Hello ${name},\n\nThank you for registering at KTG-LEDGER. We are excited to have you on board!\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a73e8;">Welcome to KTG-LEDGER 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering at <strong>KTG-LEDGER</strong>. We are thrilled to have you on board!</p>
      <p>You can now log in and start managing your finances securely.</p>
      <br/>
      <p style="color: #888; font-size: 12px;">If you did not create this account, please ignore this email or contact our support team immediately.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends a login activity alert email to notify the user of a new login to their account.
 * This helps users detect any unauthorized access to their account.
 *
 * @async
 * @function sendLoginAlertEmail
 * @param {string} userEmail - The email address of the user who just logged in.
 * @param {string} name - The full name of the user.
 * @param {string} [ipAddress='Unknown'] - The IP address from which the login was made.
 * @param {string} [device='Unknown Device'] - The device or user-agent string used for login.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendLoginAlertEmail('john@example.com', 'John Doe', '192.168.1.1', 'Chrome on macOS');
 */
async function sendLoginAlertEmail(userEmail, name, ipAddress = 'Unknown', device = 'Unknown Device') {
  const subject = 'New Login Detected – KTG-LEDGER';
  const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `Hello ${name},\n\nA new login was detected on your KTG-LEDGER account.\n\nTime: ${loginTime}\nIP Address: ${ipAddress}\nDevice: ${device}\n\nIf this was not you, please reset your password immediately and contact our support team.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #e8a21a;">🔔 New Login Detected</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We noticed a new login to your <strong>KTG-LEDGER</strong> account. Here are the details:</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">Time</td><td style="padding:8px;">${loginTime}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">IP Address</td><td style="padding:8px;">${ipAddress}</td></tr>
        <tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">Device</td><td style="padding:8px;">${device}</td></tr>
      </table>
      <p style="color: #d32f2f;"><strong>If this was not you</strong>, please reset your password immediately and contact our support team.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends a password change confirmation email to alert the user that their account password was changed.
 * Acts as a security notification so the user can take immediate action if they did not initiate the change.
 *
 * @async
 * @function sendPasswordChangeEmail
 * @param {string} userEmail - The email address of the user whose password was changed.
 * @param {string} name - The full name of the user.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendPasswordChangeEmail('john@example.com', 'John Doe');
 */
async function sendPasswordChangeEmail(userEmail, name) {
  const subject = 'Your KTG-LEDGER Password Was Changed';
  const changeTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `Hello ${name},\n\nYour KTG-LEDGER account password was successfully changed on ${changeTime}.\n\nIf you did not make this change, please contact our support team immediately to secure your account.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2e7d32;">🔐 Password Changed Successfully</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>KTG-LEDGER</strong> account password was successfully changed on <strong>${changeTime}</strong>.</p>
      <p style="color: #d32f2f;"><strong>If you did not make this change</strong>, please contact our support team immediately to secure your account.</p>
      <br/>
      <p style="color: #888; font-size: 12px;">For security reasons, please do not share your password with anyone.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends a password reset OTP (One-Time Password) email to the user.
 * The OTP should be short-lived and used to verify the user's identity before allowing a password reset.
 *
 * @async
 * @function sendPasswordResetOTPEmail
 * @param {string} userEmail - The email address of the user requesting a password reset.
 * @param {string} name - The full name of the user.
 * @param {string} otp - The one-time password (OTP) to be sent for password reset verification.
 * @param {number} [expiryMinutes=10] - The number of minutes before the OTP expires.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendPasswordResetOTPEmail('john@example.com', 'John Doe', '847291', 10);
 */
async function sendPasswordResetOTPEmail(userEmail, name, otp, expiryMinutes = 10) {
  const subject = 'Password Reset OTP – KTG-LEDGER';
  const text = `Hello ${name},\n\nYour OTP for resetting your KTG-LEDGER password is: ${otp}\n\nThis OTP is valid for ${expiryMinutes} minutes. Do not share it with anyone.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a73e8;">🔑 Password Reset OTP</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset the password for your <strong>KTG-LEDGER</strong> account.</p>
      <p>Use the OTP below to proceed. <strong>Do not share this with anyone.</strong></p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a73e8; background: #e8f0fe; padding: 12px 24px; border-radius: 8px;">${otp}</span>
      </div>
      <p>⏳ This OTP will expire in <strong>${expiryMinutes} minutes</strong>.</p>
      <p style="color: #888; font-size: 12px;">If you did not request a password reset, please ignore this email. Your account is safe.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends an account lockout notification email when a user's account is temporarily locked
 * due to multiple consecutive failed login attempts.
 *
 * @async
 * @function sendAccountLockedEmail
 * @param {string} userEmail - The email address of the locked-out user.
 * @param {string} name - The full name of the user.
 * @param {number} [lockDurationMinutes=30] - The number of minutes the account will remain locked.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendAccountLockedEmail('john@example.com', 'John Doe', 30);
 */
async function sendAccountLockedEmail(userEmail, name, lockDurationMinutes = 30) {
  const subject = 'Account Locked – KTG-LEDGER';
  const lockTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `Hello ${name},\n\nYour KTG-LEDGER account has been temporarily locked at ${lockTime} due to multiple failed login attempts.\n\nYour account will be automatically unlocked after ${lockDurationMinutes} minutes. Alternatively, you can reset your password to regain immediate access.\n\nIf you did not attempt to log in, please contact our support team immediately.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #d32f2f;">🔒 Account Temporarily Locked</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>KTG-LEDGER</strong> account has been temporarily locked at <strong>${lockTime}</strong> due to multiple consecutive failed login attempts.</p>
      <ul>
        <li>Your account will automatically unlock after <strong>${lockDurationMinutes} minutes</strong>.</li>
        <li>You can also <strong>reset your password</strong> for immediate access.</li>
      </ul>
      <p style="color: #d32f2f;"><strong>If you did not attempt to log in</strong>, please contact our support team immediately as your account may be under attack.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends a transaction alert email to notify the user about a debit or credit transaction on their account.
 * This is a critical security and transparency feature for banking applications.
 *
 * @async
 * @function sendTransactionAlertEmail
 * @param {string} userEmail - The email address of the account holder.
 * @param {string} name - The full name of the account holder.
 * @param {'credited'|'debited'} type - The type of transaction: 'credited' for incoming funds, 'debited' for outgoing funds.
 * @param {number} amount - The transaction amount in INR (₹).
 * @param {number} balance - The updated account balance after the transaction.
 * @param {string} [description='N/A'] - A brief description or reference for the transaction.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendTransactionAlertEmail('john@example.com', 'John Doe', 'debited', 5000, 45000, 'Online Purchase - Amazon');
 */
async function sendTransactionAlertEmail(userEmail, name, type, amount, balance, description = 'N/A') {
  const isCredited = type === 'credited';
  const subject = `Transaction Alert: ₹${amount} ${isCredited ? 'Credited' : 'Debited'} – KTG-LEDGER`;
  const txnTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const color = isCredited ? '#2e7d32' : '#d32f2f';
  const icon = isCredited ? '⬆️' : '⬇️';

  const text = `Hello ${name},\n\nA transaction of ₹${amount} has been ${type} ${isCredited ? 'to' : 'from'} your KTG-LEDGER account.\n\nDate & Time: ${txnTime}\nTransaction Type: ${type.toUpperCase()}\nAmount: ₹${amount}\nAvailable Balance: ₹${balance}\nDescription: ${description}\n\nIf you did not authorize this transaction, please contact our support team immediately.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: ${color};">${icon} Transaction Alert</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>A transaction has been processed on your <strong>KTG-LEDGER</strong> account.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">Date & Time</td><td style="padding:8px;">${txnTime}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Transaction Type</td><td style="padding:8px; color:${color}; font-weight:bold;">${type.toUpperCase()}</td></tr>
        <tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">Amount</td><td style="padding:8px; color:${color}; font-weight:bold;">₹${amount}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Available Balance</td><td style="padding:8px;">₹${balance}</td></tr>
        <tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">Description</td><td style="padding:8px;">${description}</td></tr>
      </table>
      <p style="color: #d32f2f; font-size: 13px;"><strong>Did not authorize this?</strong> Please contact our support team immediately.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

/**
 * Sends a low balance alert email when the user's account balance drops below a defined threshold.
 * Helps users proactively manage their funds and avoid failed transactions.
 *
 * @async
 * @function sendLowBalanceAlertEmail
 * @param {string} userEmail - The email address of the account holder.
 * @param {string} name - The full name of the account holder.
 * @param {number} balance - The current low account balance in INR (₹).
 * @param {number} [threshold=1000] - The minimum balance threshold below which the alert was triggered.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 *
 * @example
 * await sendLowBalanceAlertEmail('john@example.com', 'John Doe', 450, 1000);
 */
async function sendLowBalanceAlertEmail(userEmail, name, balance, threshold = 1000) {
  const subject = '⚠️ Low Balance Alert – KTG-LEDGER';
  const text = `Hello ${name},\n\nThis is a reminder that your KTG-LEDGER account balance has fallen below ₹${threshold}.\n\nCurrent Balance: ₹${balance}\n\nPlease add funds to your account to avoid any failed transactions.\n\nBest regards,\nKTG-LEDGER Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #e65100;">⚠️ Low Balance Alert</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>KTG-LEDGER</strong> account balance has dropped below the minimum threshold of <strong>₹${threshold}</strong>.</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 28px; font-weight: bold; color: #e65100; background: #fff3e0; padding: 12px 24px; border-radius: 8px;">Current Balance: ₹${balance}</span>
      </div>
      <p>Please add funds to your account at the earliest to avoid failed transactions or service interruptions.</p>
      <p>Best regards,<br /><strong>KTG-LEDGER Team</strong></p>
    </div>`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendLoginAlertEmail,
  sendPasswordChangeEmail,
  sendPasswordResetOTPEmail,
  sendAccountLockedEmail,
  sendTransactionAlertEmail,
  sendLowBalanceAlertEmail,
}


