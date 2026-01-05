import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get user's wishlist
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const wishlistItems = await db.all(`
            SELECT w.*, p.*, c.name as categoryName
            FROM wishlist w
            LEFT JOIN products p ON w.productId = p.id
            LEFT JOIN categories c ON p.categoryId = c.id
            WHERE w.userId = ?
            ORDER BY w.createdAt DESC
        `, [req.user.id]);

        res.json(wishlistItems || []);
    } catch (err) {
        console.error('Get wishlist error:', err);
        res.status(500).json({ message: 'Error fetching wishlist', error: err.message });
    }
});

// Add to wishlist
router.post('/', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    const db = getDB();

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    try {
        // Check if product exists
        const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already in wishlist
        const existing = await db.get('SELECT id FROM wishlist WHERE userId = ? AND productId = ?', [req.user.id, productId]);
        if (existing) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        const result = await db.run(
            'INSERT INTO wishlist (userId, productId) VALUES (?, ?)',
            [req.user.id, productId]
        );

        const newItem = await db.get(`
            SELECT w.*, p.*, c.name as categoryName
            FROM wishlist w
            LEFT JOIN products p ON w.productId = p.id
            LEFT JOIN categories c ON p.categoryId = c.id
            WHERE w.id = ?
        `, [result.lastID]);

        res.status(201).json(newItem);
    } catch (err) {
        console.error('Add to wishlist error:', err);
        res.status(500).json({ message: 'Error adding to wishlist', error: err.message });
    }
});

// Remove from wishlist
router.delete('/:productId', authenticateToken, async (req, res) => {
    const db = getDB();

    try {
        const item = await db.get('SELECT * FROM wishlist WHERE userId = ? AND productId = ?', [req.user.id, req.params.productId]);
        if (!item) {
            return res.status(404).json({ message: 'Item not in wishlist' });
        }

        await db.run('DELETE FROM wishlist WHERE userId = ? AND productId = ?', [req.user.id, req.params.productId]);
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.error('Remove from wishlist error:', err);
        res.status(500).json({ message: 'Error removing from wishlist', error: err.message });
    }
});

export default router;
