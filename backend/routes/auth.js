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
    console.log('Register endpoint hit with body:', req.body);
    try {
        const { name, email, password, role } = req.body;
        console.log('Extracted:', { name, email, role });

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const db = getDB();
        console.log('Got DB instance');

        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Checked for existing user:', existingUser);
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'customer';
        
        // Get user count to determine if first user
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        console.log('User count:', userCount);
        const isFirstUser = userCount.count === 0;

        const finalRole = isFirstUser ? 'admin' : userRole;
        const roles = isFirstUser ? JSON.stringify(['admin']) : JSON.stringify(finalRole === 'seller' ? ['seller', 'customer'] : [finalRole]);
        console.log('Final role:', finalRole, 'Roles:', roles);

        await db.run(
            'INSERT INTO users (name, email, password, role, roles) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, finalRole, roles]
        );
        console.log('User created successfully');

        res.status(201).json({ message: 'User created' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDB();

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        
        // Parse roles JSON string
        let roles = [];
        try {
            roles = JSON.parse(user.roles);
        } catch {
            roles = [user.role];
        }

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                roles: roles
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
});

// Upgrade customer to seller
router.post('/become-seller', authenticateToken, async (req, res) => {
    const db = getDB();

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Parse roles
        let roles = [];
        try {
            roles = JSON.parse(user.roles);
        } catch {
            roles = [user.role];
        }

        if (roles.includes('seller')) {
            return res.status(400).json({ message: 'User is already a seller' });
        }

        // Add seller role
        if (!roles.includes('seller')) {
            roles.push('seller');
        }

        await db.run(
            'UPDATE users SET role = ?, roles = ? WHERE id = ?',
            ['seller', JSON.stringify(roles), req.user.id]
        );

        res.json({
            message: 'User upgraded to seller',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'seller',
                roles: roles
            }
        });
    } catch (err) {
        console.error('Become seller error:', err);
        res.status(500).json({ message: 'Error upgrading to seller', error: err.message });
    }
});

export default router;
