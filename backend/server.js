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

// Initialize DB
setupDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

app.get('/', (req, res) => {
    res.send('Jewellery-Cart API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
