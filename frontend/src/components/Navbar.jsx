import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import Fuse from 'fuse.js';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const { products } = useProducts();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef(null);

    // Initialize Fuse with product data and options
    const fuse = new Fuse(products, {
        keys: ['name', 'description'],
        threshold: 0.4, // Tolerance for fuzzy matching (0.0 = exact, 1.0 = match anything)
        distance: 100,
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 0) {
            const results = fuse.search(query).map(result => result.item).slice(0, 5);
            setSuggestions(results);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (productName) => {
        setSearchQuery(productName);
        navigate(`/search?q=${encodeURIComponent(productName)}`);
        setShowSuggestions(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">Jewellery-Cart</Link>
            </div>
            <div className="navbar-search-container" ref={searchRef}>
                <form className="navbar-search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => { if (searchQuery) setShowSuggestions(true); }}
                    />
                    <button type="submit">Search</button>
                </form>
                {showSuggestions && suggestions.length > 0 && (
                    <div className="search-suggestions">
                        {suggestions.map((product) => (
                            <div
                                key={product.id}
                                className="suggestion-item"
                                onClick={() => handleSuggestionClick(product.name)}
                            >
                                {product.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="navbar-links">
                <Link to="/products">Products</Link>
                <Link to="/cart" className="cart-link">
                    Cart <span className="cart-count">{cartCount}</span>
                </Link>
                {user ? (
                    <div className="navbar-user">
                        <div className="user-info">
                            <span className="user-greeting">Hi, {user.name}</span>
                            {(user.role === 'superadmin' || (user.roles && user.roles.includes('superadmin'))) && (
                                <span className="role-badge">Admin</span>
                            )}
                        </div>
                        <div className="user-actions">
                            <Link to="/orders" className="user-action-link">
                                {(user.role === 'admin' || user.role === 'superadmin' ||
                                    (user.roles && (user.roles.includes('admin') || user.roles.includes('superadmin'))))
                                    ? 'All Orders' : 'My Orders'}
                            </Link>
                            <Link to="/account-settings" className="user-action-link">Settings</Link>
                            {(user.role === 'superadmin' || (user.roles && user.roles.includes('superadmin'))) && (
                                <Link to="/super-admin" className="user-action-link">Dashboard</Link>
                            )}
                            {user.role === 'admin' && <Link to="/admin" className="user-action-link">Dashboard</Link>}
                            {(user.role === 'seller' || (user.roles && user.roles.includes('seller'))) && <Link to="/seller-dashboard" className="user-action-link">Seller</Link>}
                            <button onClick={logout} className="logout-btn">Sign Out</button>
                        </div>
                    </div>
                ) : (
                    <Link to="/login" className="sign-in-btn">Sign In</Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
