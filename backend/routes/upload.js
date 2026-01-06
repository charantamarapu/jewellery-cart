import express from 'express';
import multer from 'multer';
import { authenticateToken, isSellerOrAdmin } from './auth.js';

const router = express.Router();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Upload image endpoint
router.post('/image', authenticateToken, isSellerOrAdmin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Convert buffer to base64 for transmission
        const base64Image = req.file.buffer.toString('base64');
        const imageType = req.file.mimetype;

        res.json({
            success: true,
            image: base64Image,
            imageType: imageType,
            size: req.file.size
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
