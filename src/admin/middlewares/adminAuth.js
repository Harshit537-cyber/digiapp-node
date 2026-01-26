const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Role check (Case-insensitive check karein taaki admin/ADMIN dono chalein)
        if (decoded.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        // ISKO CHANGE KIYA: req.admin ki jagah req.user
        req.user = decoded; 
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = verifyAdmin;