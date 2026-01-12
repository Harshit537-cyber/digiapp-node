const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Bearer Token

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if role is admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = verifyAdmin;