import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isAdmin, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Get all products with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    const db = getDB();
    try {
        const {
            category,
            minPrice,
            maxPrice,
            search,
            sort = 'createdAt',
            order = 'DESC',
            page = 1,
            limit = 12
        } = req.query;

        let whereClauses = [];
        let params = [];

        // Category filter
        if (category) {
            whereClauses.push('p.categoryId = ?');
            params.push(category);
        }

        // Price range filter
        if (minPrice) {
            whereClauses.push('p.price >= ?');
            params.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            whereClauses.push('p.price <= ?');
            params.push(parseFloat(maxPrice));
        }

        // Search filter
        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Validate sort column
        const validSorts = ['price', 'name', 'createdAt', 'stock'];
        const sortColumn = validSorts.includes(sort) ? `p.${sort}` : 'p.createdAt';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM products p ${whereSQL}`;
        const { total } = await db.get(countQuery, params);

        // Get paginated products with category and average rating
        const productsQuery = `
            SELECT p.*, 
                   c.name as categoryName,
                   c.slug as categorySlug,
                   COALESCE(AVG(r.rating), 0) as avgRating,
                   COUNT(DISTINCT r.id) as reviewCount
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN reviews r ON p.id = r.productId
            ${whereSQL}
            GROUP BY p.id
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        const products = await db.all(productsQuery, [...params, limitNum, offset]);

        res.json({
            products: products || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
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
        const product = await db.get(`
            SELECT p.*, 
                   c.name as categoryName,
                   c.slug as categorySlug,
                   COALESCE(AVG(r.rating), 0) as avgRating,
                   COUNT(DISTINCT r.id) as reviewCount
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN reviews r ON p.id = r.productId
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);
        
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ message: 'Error fetching product', error: err.message });
    }
});

// Add product (Admin or Seller only)
router.post('/', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, price, description, image, stock, categoryId, images } = req.body;
    const db = getDB();

    if (!name || !price || !image) {
        return res.status(400).json({ message: 'Name, price, and image are required' });
    }

    try {
        const sellerId = req.user.role === 'seller' ? req.user.id : null;
        const productStock = stock !== undefined ? stock : 0;
        const imagesJSON = images ? JSON.stringify(images) : null;
        
        const result = await db.run(
            'INSERT INTO products (name, price, description, image, stock, sellerId, categoryId, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, price, description || '', image, productStock, sellerId, categoryId || null, imagesJSON]
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
    const { name, price, description, image, stock, categoryId, images } = req.body;
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

        const imagesJSON = images ? JSON.stringify(images) : product.images;

        await db.run(
            'UPDATE products SET name = ?, price = ?, description = ?, image = ?, stock = ?, categoryId = ?, images = ? WHERE id = ?',
            [
                name || product.name, 
                price || product.price, 
                description !== undefined ? description : product.description, 
                image || product.image,
                stock !== undefined ? stock : product.stock,
                categoryId !== undefined ? categoryId : product.categoryId,
                imagesJSON,
                id
            ]
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
