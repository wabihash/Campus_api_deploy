const db = require('../db/DbConfig');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

function getSmtpConfig() {
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.PASSWORD || process.env.GMAIL_PASS;
    if (!smtpUser || !smtpPass) return null;

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = process.env.SMTP_SECURE
        ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
        : String(smtpPort) === '465';
    const emailFrom = process.env.EMAIL_FROM || smtpUser;

    return { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, emailFrom };
}

function sendEmailSafe({ to, subject, html, text }) {
    try {
        const cfg = getSmtpConfig();
        if (!cfg) {
            console.log("SMTP auth not set, skipping email.");
            return;
        }

        const transporter = nodemailer.createTransport({
            host: cfg.smtpHost,
            port: cfg.smtpPort,
            secure: cfg.smtpSecure,
            auth: {
                user: cfg.smtpUser,
                pass: cfg.smtpPass,
            },
        });

        transporter
            .sendMail({
                from: `"Campus Hub" <${cfg.emailFrom}>`,
                to,
                subject,
                html,
                text,
            })
            .then(() => console.log(`SMTP email sent: "${subject}" -> ${to}`))
            .catch(e => console.log("SMTP email failed, but moving on...", e?.message || e));
    } catch (mailErr) {
        console.log("Mail skipped");
    }
}
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

        const displayName = firstname || username;
        const appUrl = process.env.CLIENT_URL || "https://campus-hub-9gi7.vercel.app";
        const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden;">
                    <div style="padding:20px 24px; background:#4f46e5; color:#ffffff;">
                        <h1 style="margin:0; font-size:20px; font-weight:700;">Campus Hub</h1>
                    </div>
                    <div style="padding:24px; color:#111827; line-height:1.6;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Welcome, ${displayName}!</h2>
                        <p style="margin:0 0 16px;">Thanks for joining Campus Hub. You can now ask questions, share answers, and connect with your campus community.</p>
                        <a href="${appUrl}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">Go to Campus Hub</a>
                        <p style="margin:16px 0 0; font-size:12px; color:#6b7280;">If this wasn’t you, you can ignore this message.</p>
                    </div>
                </div>
            </div>
        `;

        // Fire-and-forget welcome email
        sendEmailSafe({
            to: email,
            subject: 'Welcome to Campus Hub',
            html: welcomeHtml,
            text: `Welcome to Campus Hub, ${displayName}! Visit ${appUrl}`,
        });

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

        // 1. Save to TiDB (This part is working!)
        await db.query('DELETE FROM password_resets WHERE userid = ?', [user.userid]);
        await db.query(
            'INSERT INTO password_resets (userid, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))',
            [user.userid, tokenHash]
        );

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

        // 2. Try to send email, but DON'T crash if it fails
        sendEmailSafe({
            to: email,
            subject: 'Reset Password',
            html: `<p>Click here to reset: <a href="${resetUrl}">${resetUrl}</a></p>`,
            text: `Reset your password: ${resetUrl}`,
        });

        // 3. ALWAYS return success and the URL so React can navigate
        return res.status(StatusCodes.OK).json({ 
            success: true, 
            message: 'If that email exists, a reset link has been sent'
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
        const [rows] = await db.query(
            'SELECT userid, expires_at FROM password_resets WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()',
            [tokenHash]
        );

        if (rows.length === 0) {
            // Distinguish invalid vs expired without relying on JS date parsing/timezone.
            const [exists] = await db.query('SELECT userid FROM password_resets WHERE token_hash = ?', [tokenHash]);
            if (exists.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid token' });
            }
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Token expired' });
        }

        const record = rows[0];

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
