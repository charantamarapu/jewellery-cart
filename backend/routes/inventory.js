import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Metal prices (you can fetch from an API or update manually)
const METAL_PRICES = {
    'gold': 14043,
    'silver': 250,
    'platinum': 6340
};

// Get current metal prices
router.get('/metals/prices', async (req, res) => {
    try {
        res.json({ success: true, prices: METAL_PRICES });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add new jewelry inventory item (Admin or Seller)
router.post('/add', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        const {
            productId,
            metal,
            metalPrice,
            hallmarked,
            purity,
            netWeight,
            extraDescription,
            extraWeight,
            extraValue,
            grossWeight,
            type,
            ornament,
            customOrnament,
            wastagePercent,
            makingChargePerGram,
            totalMakingCharge,
            totalPrice,
            image
        } = req.body;

        // Validation
        if (!metal || !netWeight || !grossWeight || !type || !ornament || !wastagePercent) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate wastage percentage only for Normal type
        if (type === 'Normal' && (wastagePercent < 4 || wastagePercent > 15)) {
            return res.status(400).json({ success: false, message: 'Wastage percent must be between 4 and 15 for Normal type' });
        }

        // Validate purity
        if (!hallmarked && (purity < 0 || purity > 999.99 || !/^\d+(\.\d{1,2})?$/.test(purity.toString()))) {
            return res.status(400).json({ success: false, message: 'Purity must have maximum 2 decimal places and be between 0-999.99' });
        }

        const result = await db.run(
            `INSERT INTO jewelry_inventory (
                productId, sellerId, metal, metalPrice, hallmarked, purity, netWeight,
                extraDescription, extraWeight, extraValue, grossWeight, type, ornament,
                customOrnament, wastagePercent, makingChargePerGram, totalMakingCharge, totalPrice, image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productId || null,
                req.user.id,
                metal,
                metalPrice,
                hallmarked ? 1 : 0,
                purity,
                netWeight,
                extraDescription || null,
                extraWeight || 0,
                extraValue || 0,
                grossWeight,
                type,
                ornament,
                customOrnament || null,
                wastagePercent,
                makingChargePerGram,
                totalMakingCharge,
                totalPrice,
                image || null
            ]
        );

        res.json({
            success: true,
            message: 'Inventory item added successfully',
            inventoryId: result.lastID
        });
    } catch (err) {
        console.error('Error adding inventory:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get inventory by product ID (public access for product detail page)
router.get('/product/:productId', async (req, res) => {
    const db = getDB();
    try {
        const item = await db.get(
            `SELECT * FROM jewelry_inventory WHERE productId = ?`,
            [req.params.productId]
        );

        if (!item) {
            return res.json({ success: true, item: null });
        }

        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete inventory item by product ID (Seller can delete own, Admin can delete any)
router.delete('/product/:productId', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        const item = await db.get(
            `SELECT * FROM jewelry_inventory WHERE productId = ?`,
            [req.params.productId]
        );

        if (!item) {
            return res.json({ success: true, message: 'No inventory found for this product' });
        }

        // Check authorization
        if (item.sellerId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.run(
            `DELETE FROM jewelry_inventory WHERE productId = ?`,
            [req.params.productId]
        );

        res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all inventory items for a seller (Seller can view own, Admin can view any)
router.get('/seller/:sellerId', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const sellerId = req.params.sellerId;

        // Check if user is authorized to view this seller's inventory
        if (req.user.id != sellerId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const items = await db.all(
            `SELECT * FROM jewelry_inventory WHERE sellerId = ? ORDER BY createdAt DESC`,
            [sellerId]
        );

        res.json({ success: true, items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single inventory item (Seller can view own, Admin can view any)
router.get('/:id', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const item = await db.get(
            `SELECT * FROM jewelry_inventory WHERE id = ?`,
            [req.params.id]
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Check authorization
        if (item.sellerId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update inventory item (Seller can update own, Admin can update any)
router.put('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        const item = await db.get(
            `SELECT * FROM jewelry_inventory WHERE id = ?`,
            [req.params.id]
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Check authorization
        if (item.sellerId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const {
            metal,
            metalPrice,
            hallmarked,
            purity,
            netWeight,
            extraDescription,
            extraWeight,
            extraValue,
            grossWeight,
            type,
            ornament,
            customOrnament,
            wastagePercent,
            makingChargePerGram,
            totalMakingCharge,
            totalPrice,
            image
        } = req.body;

        await db.run(
            `UPDATE jewelry_inventory SET
                metal = ?, metalPrice = ?, hallmarked = ?, purity = ?, netWeight = ?,
                extraDescription = ?, extraWeight = ?, extraValue = ?, grossWeight = ?,
                type = ?, ornament = ?, customOrnament = ?, wastagePercent = ?,
                makingChargePerGram = ?, totalMakingCharge = ?, totalPrice = ?, image = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                metal, metalPrice, hallmarked ? 1 : 0, purity, netWeight,
                extraDescription, extraWeight || 0, extraValue || 0, grossWeight,
                type, ornament, customOrnament, wastagePercent,
                makingChargePerGram, totalMakingCharge, totalPrice, image || null, req.params.id
            ]
        );

        res.json({ success: true, message: 'Inventory item updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete inventory item (Seller can delete own, Admin can delete any)
router.delete('/:id', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        const item = await db.get(
            `SELECT * FROM jewelry_inventory WHERE id = ?`,
            [req.params.id]
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Check authorization
        if (item.sellerId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.run(
            `DELETE FROM jewelry_inventory WHERE id = ?`,
            [req.params.id]
        );

        res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Calculate total price
router.post('/calculate', (req, res) => {
    try {
        const {
            metalPrice,
            hallmarked,
            purity,
            netWeight,
            extraValue,
            wastagePercent,
            makingChargePerGram
        } = req.body;

        // Calculate metal value
        // Purity is in percentage (e.g., 91.6 for 22K), so divide by 100
        let purityValue = hallmarked ? (purity / 100) : (purity / 100);
        const metalValue = metalPrice * netWeight * purityValue;

        // Calculate wastage
        const wastageAmount = (metalValue * wastagePercent) / 100;

        // Calculate making charges
        const totalMakingCharge = netWeight * makingChargePerGram;

        // Calculate total
        const totalPrice = metalValue + wastageAmount + totalMakingCharge + (extraValue || 0);

        res.json({
            success: true,
            metalValue,
            wastageAmount,
            totalMakingCharge,
            totalPrice
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
