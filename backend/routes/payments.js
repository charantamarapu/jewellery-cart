import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getDB } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Lazy initialization of Razorpay to ensure env vars are loaded
let razorpay = null;
let razorpayInitialized = false;

function getRazorpayInstance() {
    if (!razorpayInitialized) {
        const isConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

        console.log('🔑 Razorpay Configuration Check (lazy init):');
        console.log('   KEY_ID:', process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 15)}...` : 'NOT SET');
        console.log('   KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET (hidden)' : 'NOT SET');
        console.log('   Is Configured:', isConfigured);

        if (isConfigured) {
            try {
                razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });
                console.log('✅ Razorpay initialized successfully');
            } catch (err) {
                console.error('❌ Razorpay initialization failed:', err.message);
            }
        }
        razorpayInitialized = true;
    }
    return razorpay;
}

// Create a Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
    const { amount, orderId } = req.body;
    const db = getDB();

    // Get Razorpay instance (lazy initialization)
    const razorpayInstance = getRazorpayInstance();

    if (!razorpayInstance) {
        return res.status(503).json({
            message: 'Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.',
            configurationRequired: true
        });
    }

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        // Create Razorpay order
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `order_${orderId || Date.now()}`,
            notes: {
                userId: req.user.id.toString(),
                orderId: orderId ? orderId.toString() : ''
            }
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        // Store payment record
        await db.run(
            `INSERT INTO payments (orderId, razorpayOrderId, amount, currency, status) 
             VALUES (?, ?, ?, ?, ?)`,
            [orderId || null, razorpayOrder.id, amount, 'INR', 'created']
        );

        res.json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Create Razorpay order error:', err);
        res.status(500).json({ message: 'Failed to create payment order', error: err.message });
    }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const db = getDB();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification data' });
    }

    try {
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'demo_secret')
            .update(body.toString())
            .digest('hex');

        const isValid = expectedSignature === razorpay_signature;

        if (!isValid) {
            // Update payment status to failed
            await db.run(
                `UPDATE payments SET status = 'failed' WHERE razorpayOrderId = ?`,
                [razorpay_order_id]
            );
            return res.status(400).json({ message: 'Invalid payment signature', verified: false });
        }

        // Update payment record
        await db.run(
            `UPDATE payments SET 
                razorpayPaymentId = ?, 
                razorpaySignature = ?, 
                status = 'captured' 
             WHERE razorpayOrderId = ?`,
            [razorpay_payment_id, razorpay_signature, razorpay_order_id]
        );

        // Get the payment record to find associated order
        const payment = await db.get(
            'SELECT * FROM payments WHERE razorpayOrderId = ?',
            [razorpay_order_id]
        );

        if (payment && payment.orderId) {
            // Update order status to confirmed and payment status to paid
            // Also save the transaction ID (razorpay_payment_id)
            await db.run(
                `UPDATE orders SET status = 'confirmed', paymentStatus = 'paid', transactionId = ? WHERE id = ?`,
                [razorpay_payment_id, payment.orderId]
            );

            // Now decrement stock since payment is confirmed
            const order = await db.get('SELECT items FROM orders WHERE id = ?', [payment.orderId]);
            if (order && order.items) {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                for (const item of items) {
                    await db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [item.quantity, item.id, item.quantity]
                    );
                }
            }
        }

        res.json({
            verified: true,
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id
        });
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ message: 'Payment verification failed', error: err.message });
    }
});

// Get payment status
router.get('/status/:orderId', authenticateToken, async (req, res) => {
    const db = getDB();
    try {
        const payment = await db.get(
            'SELECT * FROM payments WHERE orderId = ?',
            [req.params.orderId]
        );

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json(payment);
    } catch (err) {
        console.error('Get payment status error:', err);
        res.status(500).json({ message: 'Error fetching payment status', error: err.message });
    }
});

export default router;
