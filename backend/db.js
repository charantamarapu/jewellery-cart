import Database from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
let db = null;
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@abc.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin@2026';

// Promise wrapper for database operations
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbExec = (sql) => {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const setupDB = async () => {
    return new Promise((resolve, reject) => {
        try {
            db = new Database.Database(dbPath, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    // Enable foreign keys
                    await dbExec('PRAGMA foreign_keys = ON');

                    // Create tables
                    await dbExec(`
                        CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            email TEXT UNIQUE NOT NULL,
                            password TEXT NOT NULL,
                            role TEXT DEFAULT 'customer',
                            roles TEXT DEFAULT '["customer"]',
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                        );

                        CREATE TABLE IF NOT EXISTS products (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            imageUrl TEXT,
                            images TEXT DEFAULT '[]',
                            description TEXT,
                            stock INTEGER DEFAULT 0,
                            categoryId INTEGER,
                            sellerId INTEGER,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (sellerId) REFERENCES users(id),
                            FOREIGN KEY (categoryId) REFERENCES categories(id)
                        );

                        CREATE TABLE IF NOT EXISTS categories (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT UNIQUE NOT NULL,
                            slug TEXT UNIQUE NOT NULL,
                            description TEXT,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                        );

                        CREATE TABLE IF NOT EXISTS addresses (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            userId INTEGER NOT NULL,
                            fullName TEXT NOT NULL,
                            addressLine1 TEXT NOT NULL,
                            city TEXT NOT NULL,
                            zip TEXT NOT NULL,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (userId) REFERENCES users(id)
                        );

                        CREATE TABLE IF NOT EXISTS orders (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            userId INTEGER NOT NULL,
                            items TEXT NOT NULL,
                            total REAL NOT NULL,
                            addressId INTEGER,
                            address TEXT,
                            date DATETIME DEFAULT CURRENT_TIMESTAMP,
                            status TEXT DEFAULT 'pending',
                            paymentStatus TEXT DEFAULT 'pending',
                            FOREIGN KEY (userId) REFERENCES users(id),
                            FOREIGN KEY (addressId) REFERENCES addresses(id)
                        );

                        CREATE TABLE IF NOT EXISTS audit_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            adminId INTEGER NOT NULL,
                            action TEXT NOT NULL,
                            targetType TEXT,
                            targetId INTEGER,
                            details TEXT,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (adminId) REFERENCES users(id)
                        );

                        CREATE TABLE IF NOT EXISTS reviews (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            productId INTEGER NOT NULL,
                            userId INTEGER NOT NULL,
                            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                            comment TEXT,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                            FOREIGN KEY (userId) REFERENCES users(id),
                            UNIQUE(productId, userId)
                        );

                        CREATE TABLE IF NOT EXISTS wishlist (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            userId INTEGER NOT NULL,
                            productId INTEGER NOT NULL,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (userId) REFERENCES users(id),
                            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                            UNIQUE(userId, productId)
                        );

                        CREATE TABLE IF NOT EXISTS jewelry_inventory (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            productId INTEGER,
                            sellerId INTEGER NOT NULL,
                            metal TEXT NOT NULL,
                            hallmarked INTEGER NOT NULL DEFAULT 0,
                            purity REAL NOT NULL,
                            netWeight REAL NOT NULL,
                            extraDescription TEXT,
                            extraWeight REAL DEFAULT 0,
                            extraValue REAL DEFAULT 0,
                            grossWeight REAL NOT NULL,
                            type TEXT NOT NULL,
                            ornament TEXT NOT NULL,
                            customOrnament TEXT,
                            wastagePercent REAL NOT NULL,
                            makingChargePerGram REAL NOT NULL,
                            totalMakingCharge REAL NOT NULL,
                            totalPrice REAL NOT NULL,
                            image TEXT,
                            length REAL,
                            width REAL,
                            height REAL,
                            dimensionUnit TEXT DEFAULT 'cm',
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                            FOREIGN KEY (sellerId) REFERENCES users(id),
                            FOREIGN KEY (metal) REFERENCES metal_prices(metal)
                        );

                        CREATE TABLE IF NOT EXISTS metal_prices (
                            metal TEXT PRIMARY KEY,
                            pricePerGram REAL NOT NULL,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updatedBy INTEGER,
                            FOREIGN KEY (updatedBy) REFERENCES users(id)
                        );

                        CREATE TABLE IF NOT EXISTS payments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            orderId INTEGER,
                            razorpayOrderId TEXT NOT NULL,
                            razorpayPaymentId TEXT,
                            razorpaySignature TEXT,
                            amount REAL NOT NULL,
                            currency TEXT DEFAULT 'INR',
                            status TEXT DEFAULT 'created',
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (orderId) REFERENCES orders(id)
                        );

                        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                        CREATE INDEX IF NOT EXISTS idx_products_sellerId ON products(sellerId);
                        CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);
                        CREATE INDEX IF NOT EXISTS idx_addresses_userId ON addresses(userId);
                        CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId);
                        CREATE INDEX IF NOT EXISTS idx_audit_logs_adminId ON audit_logs(adminId);
                        CREATE INDEX IF NOT EXISTS idx_reviews_productId ON reviews(productId);
                        CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews(userId);
                        CREATE INDEX IF NOT EXISTS idx_wishlist_userId ON wishlist(userId);
                        CREATE INDEX IF NOT EXISTS idx_wishlist_productId ON wishlist(productId);
                        CREATE INDEX IF NOT EXISTS idx_jewelry_inventory_sellerId ON jewelry_inventory(sellerId);
                        CREATE INDEX IF NOT EXISTS idx_jewelry_inventory_productId ON jewelry_inventory(productId);
                    `);

                    // Check if we need to migrate data from db.json
                    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
                    if (userCount.count === 0) {
                        await migrateFromJSON();
                    }

                    await ensureSuperAdmin();
                    await seedDefaultCategories();
                    await seedMetalPrices();

                    // Migration: Add paymentStatus column to orders if not exists
                    try {
                        await dbRun("ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'pending'");
                        console.log('✅ Added paymentStatus column to orders');
                    } catch (e) {
                        // Column likely already exists, ignore
                    }

                    // Migration: Set sellerId for products that don't have one
                    try {
                        const adminUser = await dbGet("SELECT id FROM users WHERE role = 'superadmin' OR role = 'admin' LIMIT 1");
                        if (adminUser) {
                            const result = await dbRun("UPDATE products SET sellerId = ? WHERE sellerId IS NULL", [adminUser.id]);
                            if (result.changes > 0) {
                                console.log(`✅ Updated ${result.changes} products with sellerId`);
                            }
                        }
                    } catch (e) {
                        console.error('Migration error:', e);
                    }

                    // Migration: Add transactionId column to orders if not exists
                    try {
                        await dbRun("ALTER TABLE orders ADD COLUMN transactionId TEXT");
                        console.log('✅ Added transactionId column to orders');
                    } catch (e) {
                        // Column likely already exists, ignore
                    }

                    console.log('✅ SQLite Database connected and initialized');
                    resolve();
                } catch (err) {
                    console.error('❌ Database setup error:', err.message);
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call setupDB() first.');
    }
    return {
        get: dbGet,
        run: dbRun,
        all: dbAll,
        exec: dbExec
    };
};

// Migrate data from old db.json file
const migrateFromJSON = async () => {
    try {
        const oldDbPath = path.join(__dirname, 'db.json');

        if (!fs.existsSync(oldDbPath)) {
            console.log('No db.json found, skipping migration');
            return;
        }

        const rawData = fs.readFileSync(oldDbPath, 'utf-8');
        const data = JSON.parse(rawData);

        // Migrate users
        if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
                const roles = user.roles ? JSON.stringify(user.roles) : JSON.stringify(['customer']);
                try {
                    await dbRun(
                        'INSERT INTO users (name, email, password, role, roles) VALUES (?, ?, ?, ?, ?)',
                        [user.name, user.email, user.password, user.role || 'customer', roles]
                    );
                } catch (err) {
                    console.log(`Skipping user ${user.email} (might be duplicate)`);
                }
            }
            console.log(`✅ Migrated users`);
        }

        // Migrate products
        if (data.products && Array.isArray(data.products)) {
            for (const product of data.products) {
                await dbRun(
                    'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
                    [product.name, product.price, product.image, product.description]
                );
            }
            console.log(`✅ Migrated ${data.products.length} products`);
        }

        // Migrate addresses
        if (data.addresses && Array.isArray(data.addresses)) {
            for (const address of data.addresses) {
                try {
                    await dbRun(
                        'INSERT INTO addresses (userId, fullName, addressLine1, city, zip) VALUES (?, ?, ?, ?, ?)',
                        [address.userId, address.fullName, address.addressLine1, address.city, address.zip]
                    );
                } catch (err) {
                    console.log(`Skipping address for user ${address.userId}`);
                }
            }
            console.log(`✅ Migrated addresses`);
        }

        // Migrate orders
        if (data.orders && Array.isArray(data.orders)) {
            for (const order of data.orders) {
                try {
                    const items = typeof order.items === 'string' ? order.items : JSON.stringify(order.items);
                    const address = typeof order.address === 'string' ? order.address : JSON.stringify(order.address);
                    await dbRun(
                        'INSERT INTO orders (userId, items, total, addressId, address, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [order.userId, items, order.total, order.addressId, address, order.date || new Date().toISOString(), order.status || 'pending']
                    );
                } catch (err) {
                    console.log(`Skipping order for user ${order.userId}`);
                }
            }
            console.log(`✅ Migrated orders`);
        }

        console.log('✅ Data migration from db.json completed successfully');
    } catch (err) {
        console.error('⚠️ Migration warning:', err.message);
        console.log('Continuing without migration...');
    }
};

export const closeDB = () => {
    if (db) {
        db.close();
        console.log('Database connection closed');
    }
};

async function ensureSuperAdmin() {
    // Normalize configured super admin account
    const existing = await dbGet('SELECT * FROM users WHERE email = ?', [SUPER_ADMIN_EMAIL]);
    if (existing) {
        const roles = ['superadmin', 'admin'];
        await dbRun('UPDATE users SET role = ?, roles = ? WHERE email = ?', ['superadmin', JSON.stringify(roles), SUPER_ADMIN_EMAIL]);
    } else {
        const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
        await dbRun(
            'INSERT INTO users (name, email, password, role, roles) VALUES (?, ?, ?, ?, ?)',
            ['Super Admin', SUPER_ADMIN_EMAIL, hashedPassword, 'superadmin', JSON.stringify(['superadmin', 'admin'])]
        );
        console.log('✅ Seeded default super admin');
    }

    // Remove superadmin role from any other accounts
    const imposters = await dbAll(
        "SELECT id, role, roles FROM users WHERE email != ? AND (role = 'superadmin' OR roles LIKE '%superadmin%')",
        [SUPER_ADMIN_EMAIL]
    );
    for (const user of imposters) {
        let parsed = [];
        try {
            parsed = JSON.parse(user.roles || '[]');
        } catch {
            parsed = [user.role].filter(Boolean);
        }
        parsed = parsed.filter((r) => r !== 'superadmin');
        const primary = parsed[0] || 'admin';
        await dbRun('UPDATE users SET role = ?, roles = ? WHERE id = ?', [primary, JSON.stringify(parsed.length ? parsed : ['admin']), user.id]);
    }
}

async function seedDefaultCategories() {
    const categories = [
        { name: 'Rings', slug: 'rings', description: 'Beautiful rings for every occasion' },
        { name: 'Necklaces', slug: 'necklaces', description: 'Elegant necklaces and pendants' },
        { name: 'Earrings', slug: 'earrings', description: 'Stunning earrings collection' },
        { name: 'Bracelets', slug: 'bracelets', description: 'Charming bracelets and bangles' },
        { name: 'Anklets', slug: 'anklets', description: 'Delicate anklets' },
        { name: 'Pendants', slug: 'pendants', description: 'Exquisite pendants' },
        { name: 'Chains', slug: 'chains', description: 'Gold and silver chains' },
        { name: 'Bridal', slug: 'bridal', description: 'Special bridal collection' }
    ];

    for (const cat of categories) {
        try {
            await dbRun(
                'INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)',
                [cat.name, cat.slug, cat.description]
            );
        } catch (err) {
            // Ignore duplicates
        }
    }
    console.log('✅ Seeded default categories');
}

async function seedMetalPrices() {
    const metals = [
        { metal: 'gold', pricePerGram: 14000 },
        { metal: 'silver', pricePerGram: 250 },
        { metal: 'platinum', pricePerGram: 6000 }
    ];

    for (const m of metals) {
        try {
            await dbRun(
                'INSERT OR IGNORE INTO metal_prices (metal, pricePerGram) VALUES (?, ?)',
                [m.metal, m.pricePerGram]
            );
        } catch (err) {
            // Ignore duplicates
        }
    }
    console.log('✅ Seeded default metal prices');
}
