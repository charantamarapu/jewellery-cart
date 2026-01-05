import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

    if (cart.length === 0) {
        return (
            <section className="cart-page empty-cart">
                <h2>Your Shopping Cart is Empty</h2>
                <p>Check out our products and find something you like!</p>
                <Link to="/products" className="continue-shopping">Continue Shopping</Link>
            </section>
        );
    }

    return (
        <section className="cart-page">
            <h2>Shopping Cart</h2>
            <div className="cart-layout">
                <div className="cart-items">
                    {cart.map((item) => (
                        <div key={item.id} className="cart-item">
                            <img src={item.image} alt={item.name} className="cart-item-image" />
                            <div className="cart-item-info">
                                <h3>{item.name}</h3>
                                <p className="cart-item-price">${item.price.toFixed(2)}</p>
                                <div className="quantity-controls">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                                <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="cart-summary">
                    <h3>Subtotal ({cart.reduce((a, c) => a + c.quantity, 0)} items):
                        <span className="cart-total-price"> ${cartTotal.toFixed(2)}</span>
                    </h3>
                    <Link to="/checkout" className="checkout-btn">Proceed to Checkout</Link>
                </div>
            </div>
        </section>
    );
};

export default Cart;
