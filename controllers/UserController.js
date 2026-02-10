const db = require('../db/DbConfig');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

async function register(req, res) {
    const { username, firstname, lastname, email, password } = req.body;

    if (!username || !firstname || !lastname || !email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'All fields are required'
        });
    }
    try {
        const [users] = await db.query(
            "SELECT userid FROM users WHERE username = ? OR email = ?",
            [username, email]
        );
        if (users.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Username or email already registered'
            });
        }
        if (password.length < 8) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // NOTE: role will default to 'user' because of our SQL schema
        await db.query(
            `INSERT INTO users 
            (username, firstname, lastname, email, password_hash)
            VALUES (?, ?, ?, ?, ?)`,
            [username, firstname, lastname, email, hashedPassword]
        );

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
}

async function login(req, res) {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Username/email and password are required'
        });
    }
    try {
        const isEmail = identifier.includes("@");
        
        // UPDATED: Now selecting "role" from the database
        const query = isEmail
            ? "SELECT userid, username, password_hash, role FROM users WHERE email = ?"
            : "SELECT userid, username, password_hash, role FROM users WHERE username = ?";

        const [users] = await db.query(query, [identifier]);
        
        if (users.length === 0) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Generate JWT token - UPDATED: Added "role" to the token payload
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { userid: user.userid, username: user.username, role: user.role }, 
            secret, 
            { expiresIn: '1d' } // Increased to 1 day for better UX
        );

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'User Login successful',
            userid: user.userid,
            username: user.username,
            role: user.role, // Sending role to frontend
            token: token
        });
    } catch (err) {
        console.error(err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
}

async function checkUser(req, res) {
    // UPDATED: Now returns role as well
    const { username, userid, role } = req.user;
    res.status(StatusCodes.OK).json({ msg: "valid user", username, userid, role });
}

module.exports = { register, login, checkUser };

// ------------------ Password reset handlers ------------------
async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Email required' });

    try {
        const [users] = await db.query('SELECT userid, username FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // respond success to avoid user enumeration
            return res.status(StatusCodes.OK).json({ success: true, message: 'If that email exists, a reset link has been sent' });
        }

        const user = users[0];

        // ensure password_resets table exists
        await db.query(`CREATE TABLE IF NOT EXISTS password_resets (
            id INT PRIMARY KEY AUTO_INCREMENT,
            userid INT NOT NULL,
            token_hash VARCHAR(128) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX (userid),
            INDEX (token_hash)
        )`);

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // remove old tokens for this user
        await db.query('DELETE FROM password_resets WHERE userid = ?', [user.userid]);
        await db.query('INSERT INTO password_resets (userid, token_hash, expires_at) VALUES (?, ?, ?)', [user.userid, tokenHash, expiresAt]);

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${token}`;

        // send email (best-effort)
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to: email,
                subject: 'Reset your Campus Hub password',
                html: `<p>Hi ${user.username},</p>
                       <p>We received a request to reset your password. Click the link below to choose a new password. This link expires in one hour.</p>
                       <p><a href="${resetUrl}">Reset your password</a></p>
                       <p>If you didn't request this, you can safely ignore this message.</p>`
            };

            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error('Failed to send reset email:', mailErr);
            // continue — we don't want to leak info to the client
        }

        return res.status(StatusCodes.OK).json({ success: true, message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
        console.error(err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Token and new password required' });
    if (password.length < 8) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Password must be at least 8 characters' });

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const [rows] = await db.query('SELECT userid, expires_at FROM password_resets WHERE token_hash = ?', [tokenHash]);
        if (rows.length === 0) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid or expired token' });

        const record = rows[0];
        const expires = new Date(record.expires_at);
        if (expires < new Date()) {
            await db.query('DELETE FROM password_resets WHERE userid = ?', [record.userid]);
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE userid = ?', [hashedPassword, record.userid]);
        await db.query('DELETE FROM password_resets WHERE userid = ?', [record.userid]);

        return res.status(StatusCodes.OK).json({ success: true, message: 'Password has been reset' });
    } catch (err) {
        console.error(err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

// export additions
module.exports = { register, login, checkUser, forgotPassword, resetPassword };