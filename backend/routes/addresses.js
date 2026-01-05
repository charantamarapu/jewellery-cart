import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all addresses for a user
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    await db.read();

    const userAddresses = db.data.addresses.filter(addr => addr.userId === req.user.id);
    res.json(userAddresses);
});

// Add new address
router.post('/', authenticateToken, async (req, res) => {
    const { fullName, addressLine1, city, zip } = req.body;
    const db = getDB();
    await db.read();

    if (!fullName || !addressLine1 || !city || !zip) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newAddress = {
        id: Date.now(),
        userId: req.user.id,
        fullName,
        addressLine1,
        city,
        zip,
        createdAt: new Date().toISOString()
    };

    db.data.addresses.push(newAddress);
    await db.write();

    res.status(201).json(newAddress);
});

// Delete address
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDB();
    await db.read();

    const address = db.data.addresses.find(addr => addr.id === parseInt(req.params.id));
    if (!address) {
        return res.status(404).json({ message: 'Address not found' });
    }

    if (address.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    db.data.addresses = db.data.addresses.filter(addr => addr.id !== parseInt(req.params.id));
    await db.write();

    res.json({ message: 'Address deleted' });
});

export default router;
