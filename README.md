# Jewellery-Cart

A full-stack, production-ready e-commerce application for jewellery with advanced features and multi-role support.

## 🌟 Features

### ✨ User Roles & Capabilities
- **Super Admin**: Full system control - manage users/roles, inventory, orders, audit logs
- **Admin**: Manage all products, categories, view analytics
- **Seller**: Create and manage own products
- **Customer**: Browse, cart, checkout, order tracking, reviews, wishlist

### 🛍️ E-Commerce Features
- **Product Catalog**
  - 8 pre-defined jewellery categories (Rings, Necklaces, Earrings, Bracelets, Anklets, Pendants, Chains, Bridal)
  - Advanced filtering (category, price range, search)
  - Multiple sorting options (price, name, date)
  - Pagination with smart page navigation
  - Product ratings and reviews
  - Stock status indicators
  
- **Shopping Experience**
  - Real-time shopping cart
  - Wishlist functionality
  - Product reviews and ratings (1-5 stars)
  - Secure checkout with address management
  - Order tracking & status updates
  
- **Inventory Management**
  - Stock tracking with automatic updates
  - Low stock warnings
  - Out-of-stock prevention
  - Multi-image support per product

- **Security & Administration**
  - Role-based access control
  - Protected routes
  - Audit logging for admin actions
  - Single super admin enforcement
  - JWT authentication

- **UX Enhancements**
  - Toast notifications
  - Loading skeletons
  - Responsive design (mobile-friendly)
  - Smooth animations and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd jewellery-cart
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   echo "PORT=5000
   JWT_SECRET=your-super-secure-random-string
   SUPER_ADMIN_EMAIL=admin@abc.com
   SUPER_ADMIN_PASSWORD=Admin@2026
   NODE_ENV=development" > .env
   
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

### Default Super Admin Login
- **Email**: `admin@abc.com`
- **Password**: `Admin@2026`

⚠️ **Change these credentials in production via environment variables!**

## Tech Stack

### Backend
- Express.js
- SQLite3 (with migration support)
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React 18 + Vite
- React Router v6
- Context API for state management
- Fuse.js for fuzzy search

## Version History

### v3.0 - Production Ready (Latest)
**Full-featured e-commerce platform ready for deployment**

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for comprehensive documentation.

- ✅ Product categories system (8 jewellery categories)
- ✅ Advanced filtering & sorting
- ✅ Pagination with smart navigation
- ✅ Product reviews & ratings (1-5 stars)
- ✅ Wishlist functionality
- ✅ Enhanced product data (multi-images, stock badges)
- ✅ Loading skeletons & animations
- ✅ Responsive design overhaul
- ✅ Category-based navigation
- ✅ Price range filtering

### v2.0 - Super Admin & Security

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed documentation.

- ✅ Super Admin Portal - Full control panel for system management
- ✅ Stock Management - Automatic inventory tracking and validation
- ✅ Session Sync - Role changes trigger re-authentication
- ✅ Security Hardening - Input validation, security headers, audit logs
- ✅ Protected Routes - Role-based access control on frontend
- ✅ Toast Notifications - User-friendly feedback system

## 📚 Documentation

- **[README.md](README.md)** - Quick start and overview (this file)
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete feature guide, API docs, deployment checklist
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - v2.0 improvement details
- **[SETUP.md](SETUP.md)** - Initial setup instructions

## Environment Variables

Create `.env` file in `backend/`:

```env
PORT=5000
JWT_SECRET=change-this-to-a-random-secure-string
SUPER_ADMIN_EMAIL=admin@abc.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
NODE_ENV=development
```

⚠️ **Important**: Change these default values before deploying to production!

## 🚀 Deployment

This application is production-ready! See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for:
- Complete feature documentation
- API endpoint reference
- Database schema details
- Deployment checklist
- Performance recommendations
- Testing scenarios

## License

MIT
