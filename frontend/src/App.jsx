import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AccountSettings from './pages/AccountSettings';
import SearchResults from './pages/SearchResults';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Orders from './pages/Orders';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Router>
            <div className="app">
                <Navbar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<ProductList />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/checkout" element={
                            <ProtectedRoute>
                                <Checkout />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/super-admin" element={
                            <ProtectedRoute requiredRole="superadmin">
                                <SuperAdminPortal />
                            </ProtectedRoute>
                        } />
                        <Route path="/seller-dashboard" element={
                            <ProtectedRoute requiredRoles={['seller', 'admin', 'superadmin']}>
                                <SellerDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/account-settings" element={
                            <ProtectedRoute>
                                <AccountSettings />
                            </ProtectedRoute>
                        } />
                        <Route path="/orders" element={
                            <ProtectedRoute>
                                <Orders />
                            </ProtectedRoute>
                        } />
                        <Route path="/search" element={<SearchResults />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
