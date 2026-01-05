import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isAdmin, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    const db = getDB();
    try {
        const products = await db.all('SELECT * FROM products');
        res.json(products || []);
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

// Get seller's products - MUST be before /:id
router.get('/seller/my-products', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        let products;
        if (req.user.role === 'admin') {
            products = await db.all('SELECT * FROM products');
        } else {
            products = await db.all('SELECT * FROM products WHERE sellerId = ?', [req.user.id]);
        }
        res.json(products || []);
    } catch (err) {
        console.error('Get seller products error:', err);
        res.status(500).json({ message: 'Error fetching seller products', error: err.message });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    const db = getDB();
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ message: 'Error fetching product', error: err.message });
    }
});

// Add product (Admin or Seller only)
router.post('/', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, price, description, image } = req.body;
    const db = getDB();

    if (!name || !price || !image) {
        return res.status(400).json({ message: 'Name, price, and image are required' });
    }

    try {
        const sellerId = req.user.role === 'seller' ? req.user.id : null;
        
        const result = await db.run(
            'INSERT INTO products (name, price, description, image, sellerId) VALUES (?, ?, ?, ?, ?)',
            [name, price, description || '', image, sellerId]
        );

        const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error('Add product error:', err);
        res.status(500).json({ message: 'Error creating product', error: err.message });
    }
});

// Update product (Admin or product owner)
router.put('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, price, description, image } = req.body;
    const db = getDB();
    const id = req.params.id;

    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if seller is trying to update someone else's product
        if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
            return res.status(403).json({ message: 'You can only update your own products' });
        }

        await db.run(
            'UPDATE products SET name = ?, price = ?, description = ?, image = ? WHERE id = ?',
            [name || product.name, price || product.price, description || product.description, image || product.image, id]
        );

        const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json(updatedProduct);
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ message: 'Error updating product', error: err.message });
    }
});

// Delete product (Admin or product owner)
router.delete('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    const id = req.params.id;

    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if seller is trying to delete someone else's product
        if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own products' });
        }

        await db.run('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ message: 'Error deleting product', error: err.message });
    }
});

export default router;
