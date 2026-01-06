import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isAdmin, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Helper function to calculate price from inventory
// Helper function to calculate price from inventory
const calculatePriceFromInventory = (inventory, metalPricesMap = {}) => {
    if (!inventory) return 0;

    const purity = parseFloat(inventory.purity) || 0;
    const netWeight = parseFloat(inventory.netWeight) || 0;

    // Get real-time metal price if available, fallback to stored price
    const metalKey = inventory.metal ? inventory.metal.toLowerCase() : '';
    const currentMetalPrice = metalPricesMap[metalKey];
    const metalPrice = currentMetalPrice !== undefined ? currentMetalPrice : (parseFloat(inventory.metalPrice) || 0);

    const hallmarked = inventory.hallmarked ? 1 : 0;
    const wastagePercent = parseFloat(inventory.wastagePercent) || 0;
    const makingChargePerGram = parseFloat(inventory.makingChargePerGram) || 0;
    const extraValue = parseFloat(inventory.extraValue) || 0;

    // Apply hallmark surcharge (5% for hallmarked)
    const hallmarkSurcharge = hallmarked ? 1 : 1;

    // Metal value calculation: (purity/100) * netWeight * metalPrice * hallmarkSurcharge
    const metalValue = (purity / 100) * netWeight * metalPrice * hallmarkSurcharge;

    // Wastage amount: metalValue * (wastagePercent / 100)
    const wastageAmount = metalValue * (wastagePercent / 100);

    // Making charge: netWeight * makingChargePerGram
    const totalMakingCharge = netWeight * makingChargePerGram;

    // Total price: metalValue + wastageAmount + making charge + extra value
    const totalPrice = metalValue + wastageAmount + totalMakingCharge + extraValue;

    return Math.round(totalPrice * 100) / 100; // Round to 2 decimals
};

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

        // Search filter
        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Validate sort column (remove 'price' from valid sorts since we calculate it now)
        const validSorts = ['name', 'createdAt', 'stock'];
        const sortColumn = validSorts.includes(sort) ? `p.${sort}` : 'p.createdAt';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM products p ${whereSQL}`;
        const { total } = await db.get(countQuery, params);

        // Fetch current metal prices for dynamic calculation
        const metalPrices = await db.all('SELECT metal, pricePerGram FROM metal_prices');
        const metalPricesMap = metalPrices.reduce((acc, curr) => {
            acc[curr.metal.toLowerCase()] = curr.pricePerGram;
            return acc;
        }, {});

        // Get paginated products with category, inventory, and average rating
        const productsQuery = `
            SELECT p.*, 
                   c.name as categoryName,
                   c.slug as categorySlug,
                   COALESCE(AVG(r.rating), 0) as avgRating,
                   COUNT(DISTINCT r.id) as reviewCount,
                   i.metal,
                   i.hallmarked,
                   i.purity,
                   i.netWeight,
                   i.extraDescription,
                   i.extraWeight,
                   i.extraValue,
                   i.grossWeight,
                   i.type,
                   i.ornament,
                   i.customOrnament,
                   i.wastagePercent,
                   i.makingChargePerGram
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN jewelry_inventory i ON p.id = i.productId
            LEFT JOIN reviews r ON p.id = r.productId
            ${whereSQL}
            GROUP BY p.id
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        const products = await db.all(productsQuery, [...params, limitNum, offset]);

        // Convert image buffers to base64 and calculate dynamic prices
        const productsWithImages = products.map(p => ({
            ...p,
            image: p.image ? p.image.toString('base64') : null,
            imageUrl: p.imageUrl || null,
            price: calculatePriceFromInventory(p, metalPricesMap) // Calculate price dynamically
        }));

        // Apply price range filter on calculated prices
        let filteredProducts = productsWithImages;
        if (minPrice || maxPrice) {
            filteredProducts = productsWithImages.filter(p => {
                const productPrice = p.price || 0;
                if (minPrice && productPrice < parseFloat(minPrice)) return false;
                if (maxPrice && productPrice > parseFloat(maxPrice)) return false;
                return true;
            });
        }

        res.json({
            products: filteredProducts || [],
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
            products = await db.all(`
                SELECT p.*, 
                       i.metal,
                       i.hallmarked,
                       i.purity,
                       i.netWeight,
                       i.extraDescription,
                       i.extraWeight,
                       i.extraValue,
                       i.grossWeight,
                       i.type,
                       i.ornament,
                       i.customOrnament,
                       i.wastagePercent,
                       i.makingChargePerGram
                FROM products p
                LEFT JOIN jewelry_inventory i ON p.id = i.productId
            `);
        } else {
            products = await db.all(`
                SELECT p.*, 
                       i.metal,
                       i.hallmarked,
                       i.purity,
                       i.netWeight,
                       i.extraDescription,
                       i.extraWeight,
                       i.extraValue,
                       i.grossWeight,
                       i.type,
                       i.ornament,
                       i.customOrnament,
                       i.wastagePercent,
                       i.makingChargePerGram
                FROM products p
                LEFT JOIN jewelry_inventory i ON p.id = i.productId
                WHERE p.sellerId = ?
            `, [req.user.id]);
        }

        // Fetch current metal prices for dynamic calculation
        const metalPrices = await db.all('SELECT metal, pricePerGram FROM metal_prices');
        const metalPricesMap = metalPrices.reduce((acc, curr) => {
            acc[curr.metal.toLowerCase()] = curr.pricePerGram;
            return acc;
        }, {});

        // Convert image buffers to base64 and calculate dynamic prices
        const productsWithImages = products.map(p => ({
            ...p,
            image: p.image ? p.image.toString('base64') : null,
            imageUrl: p.imageUrl || null,
            price: calculatePriceFromInventory(p, metalPricesMap) // Calculate price dynamically
        }));

        res.json(productsWithImages || []);
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
                   COUNT(DISTINCT r.id) as reviewCount,
                   i.metal,
                   i.hallmarked,
                   i.purity,
                   i.netWeight,
                   i.extraDescription,
                   i.extraWeight,
                   i.extraValue,
                   i.grossWeight,
                   i.type,
                   i.ornament,
                   i.customOrnament,
                   i.wastagePercent,
                   i.makingChargePerGram
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN jewelry_inventory i ON p.id = i.productId
            LEFT JOIN reviews r ON p.id = r.productId
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);


        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Convert image buffer to base64
        if (product.image) {
            product.image = product.image.toString('base64');
        }

        // Fetch current metal prices for dynamic calculation
        const metalPrices = await db.all('SELECT metal, pricePerGram FROM metal_prices');
        const metalPricesMap = metalPrices.reduce((acc, curr) => {
            acc[curr.metal.toLowerCase()] = curr.pricePerGram;
            return acc;
        }, {});

        // Calculate price dynamically
        product.price = calculatePriceFromInventory(product, metalPricesMap);

        res.json(product);
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ message: 'Error fetching product', error: err.message });
    }
});

// Add product (Admin or Seller only)
router.post('/', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const { name, description, imageUrl, stock, categoryId, images } = req.body;
    const db = getDB();

    if (!name) {
        return res.status(400).json({ message: 'Product name is required' });
    }

    // Must have imageUrl
    if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required' });
    }

    try {
        const sellerId = req.user.role === 'seller' ? req.user.id : null;
        const productStock = stock !== undefined ? stock : 0;
        const imagesJSON = images ? JSON.stringify(images) : null;

        const result = await db.run(
            'INSERT INTO products (name, description, imageUrl, stock, sellerId, categoryId, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description || '', imageUrl || null, productStock, sellerId, categoryId || null, imagesJSON]
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
    const { name, description, imageUrl, stock, categoryId, images } = req.body;
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
            'UPDATE products SET name = ?, description = ?, imageUrl = ?, stock = ?, categoryId = ?, images = ? WHERE id = ?',
            [
                name || product.name,
                description !== undefined ? description : product.description,
                imageUrl !== undefined ? imageUrl : product.imageUrl,
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
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ message: 'Error deleting product', error: err.message });
    }
});

// Export products as JSON (for Excel conversion on frontend)
router.get('/export/all', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    try {
        let products;
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            // Admins and super admins can export all products
            products = await db.all(`
                SELECT p.*, 
                       c.name as categoryName,
                       i.metal,
                       i.hallmarked,
                       i.purity,
                       i.netWeight,
                       i.extraDescription,
                       i.extraWeight,
                       i.extraValue,
                       i.grossWeight,
                       i.type,
                       i.ornament,
                       i.customOrnament,
                       i.wastagePercent,
                       i.makingChargePerGram,
                       i.totalPrice as inventoryTotalPrice,
                       u.email as sellerEmail,
                       u.name as sellerName
                FROM products p
                LEFT JOIN categories c ON p.categoryId = c.id
                LEFT JOIN jewelry_inventory i ON p.id = i.productId
                LEFT JOIN users u ON p.sellerId = u.id
                ORDER BY p.id DESC
            `);
        } else if (req.user.role === 'seller') {
            // Sellers can only export their own products
            products = await db.all(`
                SELECT p.*, 
                       c.name as categoryName,
                       i.metal,
                       i.hallmarked,
                       i.purity,
                       i.netWeight,
                       i.extraDescription,
                       i.extraWeight,
                       i.extraValue,
                       i.grossWeight,
                       i.type,
                       i.ornament,
                       i.customOrnament,
                       i.wastagePercent,
                       i.makingChargePerGram,
                       i.totalPrice as inventoryTotalPrice
                FROM products p
                LEFT JOIN categories c ON p.categoryId = c.id
                LEFT JOIN jewelry_inventory i ON p.id = i.productId
                WHERE p.sellerId = ?
                ORDER BY p.id DESC
            `, [req.user.id]);
        }



        // Fetch current metal prices for dynamic calculation
        const metalPrices = await db.all('SELECT metal, pricePerGram FROM metal_prices');
        const metalPricesMap = metalPrices.reduce((acc, curr) => {
            acc[curr.metal.toLowerCase()] = curr.pricePerGram;
            return acc;
        }, {});

        // Clean up data for export with dynamically calculated prices
        const cleanedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: calculatePriceFromInventory(p, metalPricesMap), // Calculate price dynamically
            stock: p.stock,
            categoryId: p.categoryId,
            categoryName: p.categoryName,
            // Inventory fields
            metal: p.metal || '',
            metalPrice: p.metalPrice || '',
            hallmarked: p.hallmarked ? 'Yes' : 'No',
            purity: p.purity || '',
            netWeight: p.netWeight || '',
            extraDescription: p.extraDescription || '',
            extraWeight: p.extraWeight || '',
            extraValue: p.extraValue || '',
            grossWeight: p.grossWeight || '',
            type: p.type || '',
            ornament: p.ornament || '',
            customOrnament: p.customOrnament || '',
            wastagePercent: p.wastagePercent || '',
            makingChargePerGram: p.makingChargePerGram || '',
            inventoryTotalPrice: calculatePriceFromInventory(p, metalPricesMap), // Calculate from inventory, not stored value
            sellerEmail: p.sellerEmail || '',
            sellerName: p.sellerName || '',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));

        res.json({
            success: true,
            data: cleanedProducts,
            count: cleanedProducts.length
        });
    } catch (err) {
        console.error('Export products error:', err);
        res.status(500).json({ success: false, message: 'Error exporting products', error: err.message });
    }
});

// Import and update products from Excel/JSON
router.post('/import/update', authenticateToken, isSellerOrAdmin, async (req, res) => {
    const db = getDB();
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid products data' });
    }

    try {
        const results = {
            updated: [],
            failed: [],
            created: []
        };

        for (const product of products) {
            try {
                // Validate required fields (don't require price as it will be calculated)
                if (!product.id || !product.name) {
                    results.failed.push({
                        id: product.id || 'unknown',
                        reason: 'Missing required fields (id, name)'
                    });
                    continue;
                }

                // Check if product exists
                const existingProduct = await db.get(
                    'SELECT * FROM products WHERE id = ?',
                    [product.id]
                );

                if (!existingProduct) {
                    // Create new product if it doesn't exist (only for admin/superadmin)
                    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
                        const insertResult = await db.run(
                            'INSERT INTO products (id, name, description, stock, categoryId, sellerId, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [
                                product.id,
                                product.name,
                                product.description || '',
                                product.stock !== undefined ? parseInt(product.stock) : 0,
                                product.categoryId || null,
                                product.sellerId || null,
                                product.imageUrl || null
                            ]
                        );

                        // Create inventory record if metal details are provided
                        if (product.metal) {
                            await db.run(
                                `INSERT INTO jewelry_inventory (productId, sellerId, metal, metalPrice, hallmarked, purity, netWeight, extraDescription, 
                                extraWeight, extraValue, grossWeight, type, ornament, customOrnament, wastagePercent, makingChargePerGram, totalMakingCharge, totalPrice)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    product.id,
                                    req.user.id,
                                    product.metal || '',
                                    parseFloat(product.metalPrice) || 0,
                                    product.hallmarked === 'Yes' ? 1 : 0,
                                    parseFloat(product.purity) || 0,
                                    parseFloat(product.netWeight) || 0,
                                    product.extraDescription || '',
                                    parseFloat(product.extraWeight) || 0,
                                    parseFloat(product.extraValue) || 0,
                                    parseFloat(product.grossWeight) || 0,
                                    product.type || 'Normal',
                                    product.ornament || '',
                                    product.customOrnament || '',
                                    parseFloat(product.wastagePercent) || 10,
                                    parseFloat(product.makingChargePerGram) || 0,
                                    0, // totalMakingCharge not needed - calculated dynamically
                                    0  // totalPrice not needed - calculated dynamically
                                ]
                            );
                        }

                        results.created.push({ id: product.id, name: product.name });
                    } else {
                        results.failed.push({
                            id: product.id,
                            reason: 'Product not found. Sellers cannot create new products via import.'
                        });
                    }
                    continue;
                }

                // Check if seller is trying to update someone else's product
                if (req.user.role === 'seller' && existingProduct.sellerId !== req.user.id) {
                    results.failed.push({
                        id: product.id,
                        reason: 'Unauthorized: You can only update your own products'
                    });
                    continue;
                }

                // Update product (without price since it will be calculated)
                await db.run(
                    'UPDATE products SET name = ?, description = ?, stock = ?, categoryId = ? WHERE id = ?',
                    [
                        product.name,
                        product.description || existingProduct.description,
                        product.stock !== undefined ? parseInt(product.stock) : existingProduct.stock,
                        product.categoryId || existingProduct.categoryId,
                        product.id
                    ]
                );

                // Update or create inventory record
                const inventory = await db.get(
                    'SELECT id FROM jewelry_inventory WHERE productId = ?',
                    [product.id]
                );

                if (product.metal) {
                    if (inventory) {
                        // Update existing inventory
                        await db.run(
                            `UPDATE jewelry_inventory SET metal = ?, metalPrice = ?, hallmarked = ?, purity = ?, netWeight = ?, 
                            extraDescription = ?, extraWeight = ?, extraValue = ?, grossWeight = ?, type = ?, 
                            ornament = ?, customOrnament = ?, wastagePercent = ?, makingChargePerGram = ?
                            WHERE productId = ?`,
                            [
                                product.metal,
                                parseFloat(product.metalPrice) || 0,
                                product.hallmarked === 'Yes' ? 1 : 0,
                                parseFloat(product.purity) || 0,
                                parseFloat(product.netWeight) || 0,
                                product.extraDescription || '',
                                parseFloat(product.extraWeight) || 0,
                                parseFloat(product.extraValue) || 0,
                                parseFloat(product.grossWeight) || 0,
                                product.type || 'Normal',
                                product.ornament || '',
                                product.customOrnament || '',
                                parseFloat(product.wastagePercent) || 10,
                                parseFloat(product.makingChargePerGram) || 0,
                                product.id
                            ]
                        );
                    } else {
                        // Create new inventory
                        await db.run(
                            `INSERT INTO jewelry_inventory (productId, sellerId, metal, metalPrice, hallmarked, purity, netWeight, extraDescription, 
                            extraWeight, extraValue, grossWeight, type, ornament, customOrnament, wastagePercent, makingChargePerGram, totalMakingCharge, totalPrice)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                product.id,
                                req.user.id,
                                product.metal,
                                parseFloat(product.metalPrice) || 0,
                                product.hallmarked === 'Yes' ? 1 : 0,
                                parseFloat(product.purity) || 0,
                                parseFloat(product.netWeight) || 0,
                                product.extraDescription || '',
                                parseFloat(product.extraWeight) || 0,
                                parseFloat(product.extraValue) || 0,
                                parseFloat(product.grossWeight) || 0,
                                product.type || 'Normal',
                                product.ornament || '',
                                product.customOrnament || '',
                                parseFloat(product.wastagePercent) || 10,
                                parseFloat(product.makingChargePerGram) || 0,
                                0,
                                0
                            ]
                        );
                    }
                }

                results.updated.push({ id: product.id, name: product.name });
            } catch (err) {
                console.error(`Error processing product ${product.id}:`, err);
                results.failed.push({
                    id: product.id,
                    reason: err.message
                });
            }
        }

        res.json({
            success: true,
            message: `Import completed: ${results.updated.length} updated, ${results.created.length} created, ${results.failed.length} failed`,
            results
        });
    } catch (err) {
        console.error('Import products error:', err);
        res.status(500).json({ success: false, message: 'Error importing products', error: err.message });
    }
});

export default router;
