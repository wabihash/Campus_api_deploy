const { StatusCodes } = require('http-status-codes');

const adminMiddleware = (req, res, next) => {
    // authMiddleware should have set req.user (or req.user.role)
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(StatusCodes.FORBIDDEN).json({ 
            msg: "Access Denied: You do not have admin privileges." 
        });
    }
};

module.exports = adminMiddleware;