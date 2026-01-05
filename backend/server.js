import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDB } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

app.get('/', (req, res) => {
    res.send('Jewellery-Cart API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
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
