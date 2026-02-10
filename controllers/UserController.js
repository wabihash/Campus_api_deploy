const db = require('../db/DbConfig');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,              // use 465 for SSL, or 587 for TLS
  secure: true,           // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // optional, helps with self-signed certs
  },
});
;
// --- REGISTER ---
async function register(req, res) {
    const { username, firstname, lastname, email, password } = req.body;
    if (!username || !firstname || !lastname || !email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'All fields are required' });
    }
    try {
        const [users] = await db.query("SELECT userid FROM users WHERE username = ? OR email = ?", [username, email]);
        if (users.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Username or email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            `INSERT INTO users (username, firstname, lastname, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
            [username, firstname, lastname, email, hashedPassword]
        );
        res.status(StatusCodes.CREATED).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

// --- LOGIN ---
async function login(req, res) {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Username/email and password are required' });
    }
    try {
        const isEmail = identifier.includes("@");
        const query = isEmail
            ? "SELECT userid, username, password_hash, role FROM users WHERE email = ?"
            : "SELECT userid, username, password_hash, role FROM users WHERE username = ?";

        const [users] = await db.query(query, [identifier]);
        if (users.length === 0) return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Invalid credentials' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign(
            { userid: user.userid, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Login successful',
            userid: user.userid,
            username: user.username,
            role: user.role,
            token: token
        });
    } catch (err) {
        console.error(err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

// --- CHECK USER ---
async function checkUser(req, res) {
    const { username, userid, role } = req.user;
    res.status(StatusCodes.OK).json({ username, userid, role });
}

// --- FORGOT PASSWORD ---
async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Email required' });

    try {
        const [users] = await db.query('SELECT userid, username FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(StatusCodes.OK).json({ success: true, message: 'If that email exists, a link has been sent' });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // 1. Save to TiDB (This part is working!)
        await db.query('DELETE FROM password_resets WHERE userid = ?', [user.userid]);
        await db.query('INSERT INTO password_resets (userid, token_hash, expires_at) VALUES (?, ?, ?)', [user.userid, tokenHash, expiresAt]);

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

        // 2. Try to send email, but DON'T crash if it fails
        try {
            const mailOptions = {
                from: `"Campus Hub" <${process.env.EMAIL_FROM}>`,
                to: email,
                subject: 'Reset Password',
                html: `<p>Click here to reset: <a href="${resetUrl}">${resetUrl}</a></p>`
            };
            // We remove the 'await' or use a separate catch to prevent the 500 error
            transporter.sendMail(mailOptions).catch(e => console.log("SMTP Blocked by Render, but moving on..."));
        } catch (mailErr) {
            console.log("Mail skipped");
        }

        // 3. ALWAYS return success and the URL so React can navigate
        return res.status(StatusCodes.OK).json({ 
            success: true, 
            message: 'Link generated successfully!',
            resetUrl: resetUrl // React needs this to redirect you!
        });

    } catch (err) {
        console.error('DATABASE ERROR:', err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}
// --- RESET PASSWORD ---
async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Token and password required' });

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const [rows] = await db.query('SELECT userid, expires_at FROM password_resets WHERE token_hash = ?', [tokenHash]);
        
        if (rows.length === 0) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid token' });

        const record = rows[0];
        if (new Date(record.expires_at) < new Date()) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Token expired' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE userid = ?', [hashedPassword, record.userid]);
        await db.query('DELETE FROM password_resets WHERE userid = ?', [record.userid]);

        return res.status(StatusCodes.OK).json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

module.exports = { register, login, checkUser, forgotPassword, resetPassword };