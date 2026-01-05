import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, isAdmin, isSuperAdmin } from './auth.js';

const router = express.Router();

// Get all categories (public)
router.get('/', async (req, res) => {
    const db = getDB();
    try {
        const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
        res.json(categories || []);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ message: 'Error fetching categories', error: err.message });
    }
});

// Get single category with product count
router.get('/:id', async (req, res) => {
    const db = getDB();
    try {
        const category = await db.get('SELECT * FROM categories WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE categoryId = ?', [category.id]);
        res.json({ ...category, productCount: productCount.count });
    } catch (err) {
        console.error('Get category error:', err);
        res.status(500).json({ message: 'Error fetching category', error: err.message });
    }
});

// Create category (admin/superadmin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    const { name, slug, description } = req.body;
    const db = getDB();

    if (!name || !slug) {
        return res.status(400).json({ message: 'Name and slug are required' });
    }

    try {
        const result = await db.run(
            'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
            [name, slug.toLowerCase(), description || '']
        );

        const newCategory = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
        res.status(201).json(newCategory);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ message: 'Category name or slug already exists' });
        }
        console.error('Create category error:', err);
        res.status(500).json({ message: 'Error creating category', error: err.message });
    }
});

// Update category (admin/superadmin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    const { name, slug, description } = req.body;
    const db = getDB();

    try {
        const category = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await db.run(
            'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
            [name || category.name, slug || category.slug, description !== undefined ? description : category.description, req.params.id]
        );

        const updatedCategory = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        res.json(updatedCategory);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ message: 'Category name or slug already exists' });
        }
        console.error('Update category error:', err);
        res.status(500).json({ message: 'Error updating category', error: err.message });
    }
});

// Delete category (admin/superadmin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    const db = getDB();

    try {
        const category = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if category has products
        const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE categoryId = ?', [req.params.id]);
        if (productCount.count > 0) {
            return res.status(400).json({ message: `Cannot delete category with ${productCount.count} products. Reassign or delete products first.` });
        }

        await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({ message: 'Error deleting category', error: err.message });
    }
});

export default router;
