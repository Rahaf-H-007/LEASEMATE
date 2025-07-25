const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token received:', token ? token.substring(0, 20) + '...' : 'null');
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded successfully, user ID:', decoded.id);

            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                console.log('User not found in database');
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            if (user.isBlocked) {
                console.log('User is blocked');
                return res.status(403).json({ message: 'تم حظرك من المنصة بسبب تكرار التعليقات المسيئة. يرجى التواصل مع الإدارة إذا كان هناك خطأ.' });
            }

            req.user = user;
            console.log('User authenticated:', user._id, user.name);
            next();
        } catch (error) {
            console.error("Token verification error:", error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        console.log('No authorization header or Bearer token');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

module.exports = { protect, admin };
