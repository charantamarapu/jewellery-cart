import express from 'express';
import { getDB } from '../db.js';

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

// Add product (Simulated Admin check)
router.post('/', async (req, res) => {
    const { name, price, description, image } = req.body;
    const db = getDB();
    await db.read();

    const newProduct = {
        id: Date.now(),
        name,
        price,
        description,
        image
    };

    db.data.products.push(newProduct);
    await db.write();
    res.status(201).json(newProduct);
});

// Delete product
router.delete('/:id', async (req, res) => {
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);

    const initialLength = db.data.products.length;
    db.data.products = db.data.products.filter(p => p.id !== id);
    await db.write();

    if (db.data.products.length === initialLength) {
        return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted' });
});

export default router;
