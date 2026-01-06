import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isSellerOrAdmin } from './auth.js';
import { fetchLiveRates, getMetalPrices } from '../utils/liveRates.js';

const router = express.Router();

// Get current metal prices from database or live rates
router.get('/metals/prices', async (req, res) => {
    const db = getDB();
    try {
        const prices = await getMetalPrices(db);
        res.json({ success: true, prices });
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
            image,
            length,
            width,
            height,
            dimensionUnit
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
                productId, sellerId, metal, hallmarked, purity, netWeight,
                extraDescription, extraWeight, extraValue, grossWeight, type, ornament,
                customOrnament, wastagePercent, makingChargePerGram, totalMakingCharge, totalPrice, image,
                length, width, height, dimensionUnit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productId || null,
                req.user.id,
                metal,
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
                totalMakingCharge || 0, // Not required, will be calculated dynamically
                totalPrice || 0, // Not required, will be calculated dynamically
                image || null,
                length || null,
                width || null,
                height || null,
                dimensionUnit || 'cm'
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

        // Fetch current metal prices (live rates for gold/silver, database for platinum)
        const allPrices = await getMetalPrices(db);
        const metalPricesMap = allPrices ? allPrices : {};

        // Get current metal price for this item (uses live rates for gold/silver)
        const metalKey = item.metal ? item.metal.toLowerCase() : '';
        const currentMetalPrice = metalPricesMap[metalKey] || item.metalPrice || 0;

        // Calculate total price using current metal price
        const purity = parseFloat(item.purity) || 0;
        const netWeight = parseFloat(item.netWeight) || 0;
        const wastagePercent = parseFloat(item.wastagePercent) || 0;
        const makingChargePerGram = parseFloat(item.makingChargePerGram) || 0;
        const extraValue = parseFloat(item.extraValue) || 0;

        const metalValue = (purity / 100) * netWeight * currentMetalPrice;
        const wastageAmount = metalValue * (wastagePercent / 100);
        const totalMakingCharge = netWeight * makingChargePerGram;
        const totalPrice = metalValue + wastageAmount + totalMakingCharge + extraValue;

        // Return item with updated metal price and calculated total price
        const itemWithUpdatedPrice = {
            ...item,
            metalPrice: currentMetalPrice,
            totalPrice: Math.round(totalPrice * 100) / 100
        };

        res.json({ success: true, item: itemWithUpdatedPrice });
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
            image,
            length,
            width,
            height,
            dimensionUnit
        } = req.body;

        await db.run(
            `UPDATE jewelry_inventory SET
                metal = ?, hallmarked = ?, purity = ?, netWeight = ?,
                extraDescription = ?, extraWeight = ?, extraValue = ?, grossWeight = ?,
                type = ?, ornament = ?, customOrnament = ?, wastagePercent = ?,
                makingChargePerGram = ?, image = ?, length = ?, width = ?, height = ?, 
                dimensionUnit = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                metal, hallmarked ? 1 : 0, purity, netWeight,
                extraDescription, extraWeight || 0, extraValue || 0, grossWeight,
                type, ornament, customOrnament, wastagePercent,
                makingChargePerGram, image || null, length || null, width || null, height || null,
                dimensionUnit || 'cm', req.params.id
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
