
import { setupDB, getDB } from './backend/db.js';

async function checkSchema() {
    await setupDB();
    const db = getDB();

    console.log('Checking products table schema...');
    const columns = await db.all("PRAGMA table_info(products)");
    console.log('Columns:', columns.map(c => c.name));

    // Check if 'image' column exists and has content
    if (columns.some(c => c.name === 'image')) {
        console.log('Image column exists (BLOB). Checking for content...');
        const count = await db.get("SELECT COUNT(*) as c FROM products WHERE image IS NOT NULL");
        console.log('Products with non-null image blob:', count.c);
    }

    if (columns.some(c => c.name === 'imageUrl')) {
        console.log('ImageUrl column exists. Checking for content...');
        const count = await db.get("SELECT COUNT(*) as c FROM products WHERE imageUrl IS NOT NULL");
        console.log('Products with non-null imageUrl:', count.c);

        const sample = await db.get("SELECT imageUrl FROM products WHERE imageUrl IS NOT NULL LIMIT 1");
        console.log('Sample imageUrl:', sample?.imageUrl);
    }

    process.exit(0);
}

checkSchema();
