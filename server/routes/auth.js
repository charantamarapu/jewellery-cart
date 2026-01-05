import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const db = getDB();
    await db.read();

    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), name, email, password: hashedPassword, role: 'customer' };

    // Make first user admin for testing
    if (db.data.users.length === 0) newUser.role = 'admin';

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
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
