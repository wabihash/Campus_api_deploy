const db = require('../db/DbConfig');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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