import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get orders for authenticated user
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    await db.read();

    const userOrders = db.data.orders.filter(o => o.userId === req.user.id);
    res.json(userOrders);
});

// Create new order
router.post('/', authenticateToken, async (req, res) => {
    const { items, total, address, addressId } = req.body;
    const db = getDB();
    await db.read();

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!address) {
        return res.status(400).json({ message: 'Shipping address is required' });
    }

    const newOrder = {
        id: Date.now(),
        userId: req.user.id,
        items,
        total,
        address,
        addressId,
        date: new Date().toISOString(),
        status: 'Pending'
    };

    db.data.orders.push(newOrder);
    await db.write();

    res.status(201).json(newOrder);
});

export default router;
