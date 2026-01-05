import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDB } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';
import adminRoutes from './routes/admin.js';
import categoryRoutes from './routes/categories.js';
import reviewRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret') {
    console.warn('⚠️  WARNING: Using default or missing JWT_SECRET. Set a strong secret in production!');
}

if (!process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD === 'Admin@2026') {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ ERROR: Using default super admin password in production! Set SUPER_ADMIN_PASSWORD.');
    } else {
        console.warn('⚠️  WARNING: Using default super admin password. Change SUPER_ADMIN_PASSWORD for production.');
    }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/', (req, res) => {
    res.send('Jewellery-Cart API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        timestamp: new Date().toISOString()
    });
});

// Initialize DB and start server
const startServer = async () => {
    try {
        await setupDB();
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        
        // Handle server errors
        server.on('error', (err) => {
            console.error('Server error:', err);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
