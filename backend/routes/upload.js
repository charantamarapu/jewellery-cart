import express from 'express';
import multer from 'multer';
import axios from 'axios';
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

// Image proxy endpoint - handles Google Drive images
router.get('/proxy-image', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        // Validate it's a Google Drive URL
        if (!url.includes('drive.google.com')) {
            return res.status(400).json({ success: false, message: 'Only Google Drive URLs are supported' });
        }

        console.log('🖼️ Proxying image...');

        // Fetch the image from Google Drive using axios with automatic redirect following
        const response = await axios.get(url, {
            timeout: 20000,
            maxRedirects: 5,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('✅ Image fetched successfully, streaming to client');

        // Set response headers
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=86400');

        // Stream the image to the client
        response.data.pipe(res);

    } catch (err) {
        console.error('❌ Proxy error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch image from Google Drive',
                error: err.message 
            });
        }
    }
});

export default router;
