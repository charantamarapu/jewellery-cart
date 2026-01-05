import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isAdmin, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    const db = getDB();
    await db.read();
    res.json(db.data.products);
});

// Get single product
router.get('/:id', async (req, res) => {
    const db = getDB();
    await db.read();
    const product = db.data.products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
});

// Add product (Admin or Seller only)
router.post('/', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, price, description, image } = req.body;
    const db = getDB();
    await db.read();

    const newProduct = {
        id: Date.now(),
        name,
        price,
        description,
        image,
        sellerId: req.user.role === 'seller' ? req.user.id : null,
        createdBy: req.user.id
    };

    db.data.products.push(newProduct);
    await db.write();
    res.status(201).json(newProduct);
});Update product (Admin or product owner)
router.put('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, price, description, image } = req.body;
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);

    const productIndex = db.data.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const product = db.data.products[productIndex];
    
    // Check if seller is trying to update someone else's product
    if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
        return res.status(403).json({ message: 'You can only update your own products' });
    }

    db.data.products[productIndex] = {
        ...product,
        name: name || product.name,
        price: price || product.price,
        description: description || product.description,
        image: image || product.image
    };

    await db.write();
    res.json(db.data.products[productIndex]);
});

// Delete product (Admin or product owner)
router.delete('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);

    const product = db.data.products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Check if seller is trying to delete someone else's product
    if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own products' });
    }

    db.data.products = db.data.products.filter(p => p.id !== id);
    await db.write();

    res.json({ message: 'Product deleted' });
});

// Get seller's products
router.get('/seller/my-products', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    await db.read();
    
    if (req.user.role === 'admin') {
        res.json(db.data.products);
    } else {
        const sellerProducts = db.data.products.filter(p => p.sellerId === req.user.id);
        res.json(sellerProducts);
    }

    res.json({ message: 'Product deleted' });
});

export default router;
