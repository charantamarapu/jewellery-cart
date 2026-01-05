import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Middleware to check if user is seller or admin
export const isSellerOrAdmin = (req, res, next) => {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Seller or Admin access required' });
    }
    next();
};

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    const db = getDB();
    await db.read();

    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'customer'; // Default to customer
    const newUser = {
        id: Date.now(),
        name,
        email,
        password: hashedPassword,
        role: userRole,
        roles: userRole === 'seller' ? ['seller', 'customer'] : [userRole],
        createdAt: new Date().toISOString()
    };

    // Make first user admin for testing
    if (db.data.users.length === 0) {
        newUser.role = 'admin';
        newUser.roles = ['admin'];
    }

    db.data.users.push(newUser);
    await db.write();

    res.status(201).json({ message: 'User created' });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDB();
    await db.read();

    const user = db.data.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles || [user.role]
        }
    });
});

// Upgrade customer to seller
router.post('/become-seller', authenticateToken, async (req, res) => {
    const db = getDB();
    await db.read();

    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'seller' || (user.roles && user.roles.includes('seller'))) {
        return res.status(400).json({ message: 'User is already a seller' });
    }

    // Add seller role
    user.role = 'seller';
    user.roles = user.roles || [user.role === 'admin' ? 'admin' : 'customer'];
    if (!user.roles.includes('seller')) {
        user.roles.push('seller');
    }

    await db.write();

    res.json({
        message: 'User upgraded to seller',
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles
        }
    });
});

export default router;
