import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
    const db = getDB();
    try {
        const reviews = await db.all(`
            SELECT r.*, u.name as userName
            FROM reviews r
            LEFT JOIN users u ON r.userId = u.id
            WHERE r.productId = ?
            ORDER BY r.createdAt DESC
        `, [req.params.productId]);

        res.json(reviews || []);
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ message: 'Error fetching reviews', error: err.message });
    }
});

// Add or update review
router.post('/', authenticateToken, async (req, res) => {
    const { productId, rating, comment } = req.body;
    const db = getDB();

    if (!productId || !rating) {
        return res.status(400).json({ message: 'Product ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        // Check if product exists
        const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user already reviewed this product
        const existing = await db.get('SELECT id FROM reviews WHERE productId = ? AND userId = ?', [productId, req.user.id]);

        if (existing) {
            // Update existing review
            await db.run(
                'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
                [rating, comment || '', existing.id]
            );
            const updated = await db.get(`
                SELECT r.*, u.name as userName
                FROM reviews r
                LEFT JOIN users u ON r.userId = u.id
                WHERE r.id = ?
            `, [existing.id]);
            res.json(updated);
        } else {
            // Create new review
            const result = await db.run(
                'INSERT INTO reviews (productId, userId, rating, comment) VALUES (?, ?, ?, ?)',
                [productId, req.user.id, rating, comment || '']
            );

            const newReview = await db.get(`
                SELECT r.*, u.name as userName
                FROM reviews r
                LEFT JOIN users u ON r.userId = u.id
                WHERE r.id = ?
            `, [result.lastID]);
            res.status(201).json(newReview);
        }
    } catch (err) {
        console.error('Add review error:', err);
        res.status(500).json({ message: 'Error adding review', error: err.message });
    }
});

// Delete review
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDB();

    try {
        const review = await db.get('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.userId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }

        await db.run('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ message: 'Review deleted' });
    } catch (err) {
        console.error('Delete review error:', err);
        res.status(500).json({ message: 'Error deleting review', error: err.message });
    }
});

export default router;
