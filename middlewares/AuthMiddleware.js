const { StatusCodes } = require('http-status-codes'); // Ensure S is capital
const jwt = require('jsonwebtoken');

async function AuthMiddleware(req, res, next) {
    if(req.method === "OPTIONS") return next();
    
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { 
            username: decoded.username, 
            userid: decoded.userid, 
            role: decoded.role 
        };
        next();
    } catch (err) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Invalid token' });
    }
}

module.exports = AuthMiddleware;