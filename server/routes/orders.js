import express from 'express';
import { getDB } from '../db.js';

const router = express.Router();

// Get orders for a specific user (or all if admin - simplified for now)
router.get('/', async (req, res) => {
    const db = getDB();
    await db.read();

    // In a real app, verify JWT and filter by user ID from token
    // For this app, we'll just return all orders for now or filter by query param
    const userId = req.query.userId;
    if (userId) {
        const userOrders = db.data.orders.filter(o => o.userId === parseInt(userId));
        return res.json(userOrders);
    }

    res.json(db.data.orders);
});

// Create new order
router.post('/', async (req, res) => {
    const { userId, items, total, address } = req.body;
    const db = getDB();
    await db.read();

    const newOrder = {
        id: Date.now(),
        userId,
        items,
        total,
        address,
        date: new Date().toISOString(),
        status: 'Pending'
    };

    db.data.orders.push(newOrder);
    await db.write();

    res.status(201).json(newOrder);
});

export default router;
