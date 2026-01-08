import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Helper to check if user has admin role
const isAdmin = (user) => {
    return user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roles && (user.roles.includes('admin') || user.roles.includes('superadmin')));
};

// Get orders - admins see all orders, customers see only their own
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        let orders;

        if (isAdmin(req.user)) {
            // Admins see all orders with user info
            orders = await db.all(`
                SELECT orders.*, users.name as userName, users.email as userEmail 
                FROM orders 
                LEFT JOIN users ON orders.userId = users.id 
                ORDER BY orders.date DESC
            `);
        } else {
            // Regular users see only their orders
            orders = await db.all('SELECT * FROM orders WHERE userId = ? ORDER BY date DESC', [req.user.id]);
        }

        // Parse JSON strings for items and address
        const parsedOrders = (orders || []).map(order => ({
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

// Create new order (pending payment)
router.post('/', authenticateToken, async (req, res) => {
    const { items, total, address, addressId, paymentMethod } = req.body;
    const db = getDB();

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!address) {
        return res.status(400).json({ message: 'Shipping address is required' });
    }

    try {
        // Check stock availability for all items (but don't decrement yet)
        for (const item of items) {
            const product = await db.get('SELECT id, name, stock FROM products WHERE id = ?', [item.id]);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.name || item.id} not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`
                });
            }
        }

        // Convert items and address to JSON strings for storage
        const itemsJSON = typeof items === 'string' ? items : JSON.stringify(items);
        const addressJSON = typeof address === 'string' ? address : JSON.stringify(address);

        // Determine initial status based on payment method
        const isCOD = paymentMethod === 'cod';
        const status = isCOD ? 'confirmed' : 'pending';
        const paymentStatus = isCOD ? 'cod' : 'pending';

        const result = await db.run(
            'INSERT INTO orders (userId, items, total, address, addressId, status, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, itemsJSON, total, addressJSON, addressId || null, status, paymentStatus]
        );

        // For COD orders, decrement stock immediately
        if (isCOD) {
            for (const item of items) {
                await db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.id]
                );
            }
        }

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

// Get specific order
router.get('/:id', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const order = await db.get(
            'SELECT * FROM orders WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            address: typeof order.address === 'string' ? JSON.parse(order.address) : order.address
        });
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({ message: 'Error fetching order', error: err.message });
    }
});

// Cancel pending order (only if payment not completed)
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const order = await db.get(
            'SELECT * FROM orders WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Cannot cancel a paid order' });
        }

        await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ message: 'Order cancelled successfully' });
    } catch (err) {
        console.error('Cancel order error:', err);
        res.status(500).json({ message: 'Error cancelling order', error: err.message });
    }
});

export default router;

