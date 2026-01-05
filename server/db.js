import { JSONFilePreset } from 'lowdb/node';

// Default data
const defaultData = {
    users: [],
    products: [
        { id: 1, name: 'Wireless Headphones', price: 99.99, image: 'https://via.placeholder.com/150', description: 'High quality wireless headphones with noise cancellation.' },
        { id: 2, name: 'Smart Watch', price: 149.99, image: 'https://via.placeholder.com/150', description: 'Track your fitness and notifications.' },
        { id: 3, name: 'Gaming Mouse', price: 49.99, image: 'https://via.placeholder.com/150', description: 'Ergonomic gaming mouse with RGB lighting.' },
        { id: 4, name: 'Mechanical Keyboard', price: 89.99, image: 'https://via.placeholder.com/150', description: 'Responsive mechanical keyboard for typing and gaming.' }
    ],
    orders: []
};

let db;

export const setupDB = async () => {
    db = await JSONFilePreset('db.json', defaultData);
    console.log('Database connected');
};

export const getDB = () => db;
