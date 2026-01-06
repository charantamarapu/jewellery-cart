import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isSuperAdmin } from './auth.js';

const router = express.Router();
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@abc.com';
const parseRoles = (user) => {
    try {
        return JSON.parse(user.roles || '[]');
    } catch (err) {
        return user.role ? [user.role] : [];
    }
};

router.use(authenticateToken, isSuperAdmin);

router.get('/overview', async (req, res) => {
    const db = getDB();
    try {
        const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
        const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
        const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
        const sellers = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'seller' OR roles LIKE '%seller%'");
        const admins = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR roles LIKE '%admin%'");

        res.json({
            users: totalUsers.count,
            products: totalProducts.count,
            orders: totalOrders.count,
            sellers: sellers.count,
            admins: admins.count
        });
    } catch (err) {
        console.error('Super admin overview error:', err);
        res.status(500).json({ message: 'Failed to load overview', error: err.message });
    }
});

router.get('/users', async (req, res) => {
    const db = getDB();
    try {
        const users = await db.all('SELECT id, name, email, role, roles, createdAt FROM users ORDER BY createdAt DESC');
        const parsedUsers = (users || []).map((u) => ({ ...u, roles: parseRoles(u) }));
        res.json(parsedUsers);
    } catch (err) {
        console.error('Super admin users error:', err);
        res.status(500).json({ message: 'Failed to load users', error: err.message });
    }
});

router.patch('/users/:id/role', async (req, res) => {
    const db = getDB();
    const userId = req.params.id;
    const { role, roles } = req.body;

    if (!role && !roles) {
        return res.status(400).json({ message: 'Role or roles array is required' });
    }

    try {
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        let nextRoles = Array.isArray(roles) ? roles.filter(Boolean) : parseRoles(targetUser);
        let primaryRole = role || nextRoles[0] || targetUser.role;

        // Enforce single super admin by email
        const requestedSuper = primaryRole === 'superadmin' || nextRoles.includes('superadmin');
        if (requestedSuper && targetUser.email !== SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Only the configured super admin account can have the superadmin role' });
        }

        // Prevent stripping superadmin from the configured account
        if (targetUser.email === SUPER_ADMIN_EMAIL) {
            primaryRole = 'superadmin';
            nextRoles = ['superadmin', 'admin'];
        } else {
            // Ensure no other user carries superadmin in roles
            nextRoles = nextRoles.filter((r) => r !== 'superadmin');
        }

        if (!nextRoles.includes(primaryRole)) {
            nextRoles.unshift(primaryRole);
        }

        // Log the action
        await db.run(
            'INSERT INTO audit_logs (adminId, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'UPDATE_USER_ROLE', 'user', userId, JSON.stringify({ from: targetUser.role, to: primaryRole })]
        );

        await db.run('UPDATE users SET role = ?, roles = ? WHERE id = ?', [primaryRole, JSON.stringify(nextRoles), userId]);
        const updatedUser = await db.get('SELECT id, name, email, role, roles, createdAt FROM users WHERE id = ?', [userId]);
        res.json({
            ...updatedUser,
            roles: parseRoles(updatedUser),
            requiresRelogin: true
        });
    } catch (err) {
        console.error('Super admin update role error:', err);
        res.status(500).json({ message: 'Failed to update user role', error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    const db = getDB();
    const userId = req.params.id;

    try {
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deletion of superadmin
        if (targetUser.email === SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Cannot delete super admin account' });
        }

        // Prevent self-deletion
        if (req.user.id === parseInt(userId)) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        // Log the action
        await db.run(
            'INSERT INTO audit_logs (adminId, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'DELETE_USER', 'user', userId, JSON.stringify({ email: targetUser.email, name: targetUser.name })]
        );

        // Delete user's data (cascade manually since SQLite doesn't fully support it)
        await db.run('DELETE FROM addresses WHERE userId = ?', [userId]);
        await db.run('DELETE FROM orders WHERE userId = ?', [userId]);
        await db.run('DELETE FROM products WHERE sellerId = ?', [userId]);
        await db.run('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }
});

router.get('/orders', async (req, res) => {
    const db = getDB();
    try {
        const orders = await db.all(`
            SELECT o.*, u.name as customerName, u.email as customerEmail
            FROM orders o
            LEFT JOIN users u ON o.userId = u.id
            ORDER BY o.date DESC
        `);

        const parsedOrders = (orders || []).map((order) => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            address: typeof order.address === 'string' ? JSON.parse(order.address) : order.address
        }));

        res.json(parsedOrders);
    } catch (err) {
        console.error('Super admin orders error:', err);
        res.status(500).json({ message: 'Failed to load orders', error: err.message });
    }
});

router.patch('/orders/:id/status', async (req, res) => {
    const db = getDB();
    const orderId = req.params.id;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Log the action
        await db.run(
            'INSERT INTO audit_logs (adminId, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'UPDATE_ORDER_STATUS', 'order', orderId, JSON.stringify({ from: order.status, to: status })]
        );

        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        const updatedOrder = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        res.json({
            ...updatedOrder,
            items: typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items,
            address: typeof updatedOrder.address === 'string' ? JSON.parse(updatedOrder.address) : updatedOrder.address
        });
    } catch (err) {
        console.error('Super admin update order error:', err);
        res.status(500).json({ message: 'Failed to update order status', error: err.message });
    }
});

router.get('/inventory', async (req, res) => {
    const db = getDB();
    try {
        const products = await db.all(`
            SELECT p.*, u.name as sellerName, u.email as sellerEmail
            FROM products p
            LEFT JOIN users u ON p.sellerId = u.id
            ORDER BY p.createdAt DESC
        `);
        res.json(products || []);
    } catch (err) {
        console.error('Super admin inventory error:', err);
        res.status(500).json({ message: 'Failed to load inventory', error: err.message });
    }
});

// Get all metal prices (superadmin only)
router.get('/metal-prices', async (req, res) => {
    const db = getDB();
    try {
        const prices = await db.all('SELECT * FROM metal_prices ORDER BY metal ASC');
        res.json({ success: true, prices });
    } catch (err) {
        console.error('Get metal prices error:', err);
        res.status(500).json({ success: false, message: 'Failed to load metal prices', error: err.message });
    }
});

// Update metal price (superadmin only)
router.put('/metal-prices/:metal', async (req, res) => {
    const db = getDB();
    const { metal } = req.params;
    const { pricePerGram } = req.body;

    if (!pricePerGram || pricePerGram <= 0) {
        return res.status(400).json({ success: false, message: 'Valid price per gram is required' });
    }

    try {
        // Get old price for audit log
        const oldPrice = await db.get('SELECT pricePerGram FROM metal_prices WHERE metal = ?', [metal]);

        if (!oldPrice) {
            return res.status(404).json({ success: false, message: 'Metal not found' });
        }

        // Update the price
        await db.run(
            'UPDATE metal_prices SET pricePerGram = ?, updatedAt = CURRENT_TIMESTAMP, updatedBy = ? WHERE metal = ?',
            [pricePerGram, req.user.id, metal]
        );

        // Log the action
        await db.run(
            'INSERT INTO audit_logs (adminId, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?)',
            [
                req.user.id,
                'UPDATE_METAL_PRICE',
                'metal_price',
                null,
                JSON.stringify({
                    metal,
                    from: oldPrice.pricePerGram,
                    to: pricePerGram
                })
            ]
        );

        const updated = await db.get('SELECT * FROM metal_prices WHERE metal = ?', [metal]);
        res.json({ success: true, message: 'Metal price updated successfully', price: updated });
    } catch (err) {
        console.error('Update metal price error:', err);
        res.status(500).json({ success: false, message: 'Failed to update metal price', error: err.message });
    }
});

export default router;

