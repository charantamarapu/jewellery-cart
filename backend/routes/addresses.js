import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all addresses for a user
router.get('/', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const userAddresses = await db.all('SELECT * FROM addresses WHERE userId = ?', [req.user.id]);
        res.json(userAddresses || []);
    } catch (err) {
        console.error('Get addresses error:', err);
        res.status(500).json({ message: 'Error fetching addresses', error: err.message });
    }
});

// Add new address
router.post('/', authenticateToken, async (req, res) => {
    const { fullName, addressLine1, city, zip } = req.body;
    const db = getDB();

    if (!fullName || !addressLine1 || !city || !zip) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const result = await db.run(
            'INSERT INTO addresses (userId, fullName, addressLine1, city, zip) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, fullName, addressLine1, city, zip]
        );

        const newAddress = await db.get('SELECT * FROM addresses WHERE id = ?', [result.lastID]);
        res.status(201).json(newAddress);
    } catch (err) {
        console.error('Add address error:', err);
        res.status(500).json({ message: 'Error creating address', error: err.message });
    }
});

// Delete address
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDB();
    const id = req.params.id;

    try {
        const address = await db.get('SELECT * FROM addresses WHERE id = ?', [id]);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        if (address.userId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await db.run('DELETE FROM addresses WHERE id = ?', [id]);
        res.json({ message: 'Address deleted' });
    } catch (err) {
        console.error('Delete address error:', err);
        res.status(500).json({ message: 'Error deleting address', error: err.message });
    }
});

export default router;
