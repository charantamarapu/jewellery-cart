import Database from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
let db = null;

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
        db.run(sql, params, function(err) {
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
                            price REAL NOT NULL,
                            image TEXT NOT NULL,
                            description TEXT,
                            sellerId INTEGER,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (sellerId) REFERENCES users(id)
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
                            FOREIGN KEY (userId) REFERENCES users(id),
                            FOREIGN KEY (addressId) REFERENCES addresses(id)
                        );

                        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                        CREATE INDEX IF NOT EXISTS idx_products_sellerId ON products(sellerId);
                        CREATE INDEX IF NOT EXISTS idx_addresses_userId ON addresses(userId);
                        CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId);
                    `);

                    // Check if we need to migrate data from db.json
                    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
                    if (userCount.count === 0) {
                        await migrateFromJSON();
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
