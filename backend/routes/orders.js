import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get orders for authenticated user
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const userOrders = await db.all('SELECT * FROM orders WHERE userId = ? ORDER BY date DESC', [req.user.id]);
        
        // Parse JSON strings for items and address
        const parsedOrders = (userOrders || []).map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            address: typeof order.address === 'string' ? JSON.parse(order.address) : order.address
        }));
        
        res.json(parsedOrders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: 'Error fetching orders', error: err.message });
    }
});

// Create new order
router.post('/', authenticateToken, async (req, res) => {
    const { items, total, address, addressId } = req.body;
    const db = getDB();

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!address) {
        return res.status(400).json({ message: 'Shipping address is required' });
    }

    try {
        // Convert items and address to JSON strings for storage
        const itemsJSON = typeof items === 'string' ? items : JSON.stringify(items);
        const addressJSON = typeof address === 'string' ? address : JSON.stringify(address);

        const result = await db.run(
            'INSERT INTO orders (userId, items, total, address, addressId, status) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, itemsJSON, total, addressJSON, addressId || null, 'pending']
        );

        const newOrder = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
        
        // Parse JSON back
        res.status(201).json({
            ...newOrder,
            items: JSON.parse(newOrder.items),
            address: JSON.parse(newOrder.address)
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Error creating order', error: err.message });
    }
});

export default router;
