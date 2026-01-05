# Jewellery Cart - Setup Instructions

This is a monorepo containing both the frontend and backend applications separated into two folders for better organization.

## Project Structure

```
jewellery-cart/
├── frontend/          # React Vite application
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── backend/           # Node.js Express API
│   ├── routes/
│   ├── db.json
│   ├── server.js
│   ├── package.json
│   └── ...
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

## Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm start
# or for development with hot reload:
npm run dev
```

The backend API will run on **http://localhost:5000**

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on **http://localhost:5173** (or the port shown in your terminal)

### Access the Application

Open your browser and navigate to: **http://localhost:5173**

The frontend automatically proxies API calls from `/api/*` to `http://localhost:5000/api/*`

## Available Scripts

### Backend

- `npm start` - Run the server in production mode
- `npm run dev` - Run the server in development mode with auto-reload (requires nodemon)

### Frontend

- `npm run dev` - Start development server with hot module replacement
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Key Features

✅ **Address Management** - Save and reuse multiple delivery addresses
✅ **User Authentication** - Secure login/register with JWT
✅ **Seller System** - Customers can upgrade to sellers
✅ **Admin Dashboard** - Manage all products
✅ **Seller Dashboard** - Sellers manage their products
✅ **Shopping Cart** - Add/remove products and manage quantities
✅ **Checkout** - Place orders with saved addresses
✅ **Search** - Find products by name and description

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/become-seller` - Upgrade customer to seller

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add new product (admin/seller)
- `DELETE /api/products/:id` - Delete product (admin/seller)

### Addresses
- `GET /api/addresses` - Get user's saved addresses
- `POST /api/addresses` - Save new address
- `DELETE /api/addresses/:id` - Delete saved address

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Place new order

## Database

The backend uses **LowDB** (JSON-based local database) stored in `db.json`. This is perfect for development and prototyping.

### Database Structure

```json
{
  "users": [...],
  "products": [...],
  "orders": [...],
  "addresses": [...]
}
```

## Troubleshooting

### Port 5000 already in use
```bash
# Kill the process using port 5000
Get-Process -Name node | Stop-Process -Force
```

### Module not found errors
Make sure you've run `npm install` in both frontend and backend folders.

### API 404 errors
Ensure the backend server is running on port 5000 before accessing the frontend.

## Development Workflow

1. **Backend Changes**: Edit files in `backend/` and the server restarts automatically with nodemon
2. **Frontend Changes**: Edit files in `frontend/` and changes reflect instantly with Vite's HMR
3. **New API Routes**: Add routes in `backend/routes/` and restart the server

## Currency

All prices are displayed in **INR (₹)** - Indian Rupees.

## Next Steps

- Deploy backend to a hosting service (Heroku, Render, etc.)
- Deploy frontend to a CDN (Vercel, Netlify, etc.)
- Replace LowDB with a real database (MongoDB, PostgreSQL, etc.)
- Add payment integration (Stripe, Razorpay, etc.)
