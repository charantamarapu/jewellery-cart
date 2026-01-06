import React from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { getProductImageSrc } from '../utils/imageUtils';
import './Cart.css';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
    const toast = useToast();

    const handleQuantityChange = (item, newQuantity) => {
        const result = updateQuantity(item.id, newQuantity, item.stock);
        if (!result.success && result.reason === 'STOCK_LIMIT') {
            toast.warning(`Only ${result.available} items available for ${item.name}.`);
        }
    };

    const handleRemoveFromCart = (item) => {
        console.log('handleRemoveFromCart called with:', item);
        try {
            if (window.confirm(`Remove "${item.name}" from your cart?`)) {
                console.log('User confirmed removal');
                removeFromCart(item.id);
                console.log('removeFromCart executed');
                if (toast && toast.success) {
                    toast.success(`${item.name} removed from cart`);
                }
            } else {
                console.log('User cancelled removal');
            }
        } catch (error) {
            console.error('Error in handleRemoveFromCart:', error);
        }
    };

    if (cart.length === 0) {
        return (
            <section className="cart-page empty-cart">
                <div className="empty-cart-content">
                    <span className="empty-cart-icon">🛒</span>
                    <h2>Your Shopping Cart is Empty</h2>
                    <p>Check out our products and find something you like!</p>
                    <Link to="/products" className="continue-shopping">Continue Shopping</Link>
                </div>
            </section>
        );
    }

    return (
        <section className="cart-page">
            <h2>Shopping Cart</h2>
            <div className="cart-layout">
                <div className="cart-items">
                    {cart.map((item) => {
                        const isOutOfStock = item.stock === 0;
                        const isAtLimit = item.quantity >= item.stock;

                        return (
                            <div key={item.id} className={`cart-item ${isOutOfStock ? 'out-of-stock' : ''}`}>
                                <img src={getProductImageSrc(item)} alt={item.name} className="cart-item-image" />
                                <div className="cart-item-info">
                                    <h3>{item.name}</h3>
                                    <p className="cart-item-price">₹{(item.price || 0).toFixed(2)}</p>

                                    {isOutOfStock ? (
                                        <span className="stock-warning">⚠️ Out of Stock</span>
                                    ) : (
                                        <>
                                            <div className="quantity-controls">
                                                <button
                                                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                                    aria-label="Decrease quantity"
                                                >
                                                    -
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button
                                                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                                    disabled={isAtLimit}
                                                    className={isAtLimit ? 'disabled' : ''}
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            {isAtLimit && (
                                                <span className="stock-limit-note">Max available: {item.stock}</span>
                                            )}
                                        </>
                                    )}

                                    <button className="remove-btn" onClick={() => handleRemoveFromCart(item)}>Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="cart-summary">
                    <h3>Subtotal ({cart.reduce((a, c) => a + c.quantity, 0)} items):
                        <span className="cart-total-price"> ₹{cartTotal.toFixed(2)}</span>
                    </h3>
                    <Link to="/checkout" className="checkout-btn">Proceed to Checkout</Link>
                </div>
            </div>
        </section>
    );
};

export default Cart;
