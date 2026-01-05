import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [address, setAddress] = useState({
        fullName: '',
        addressLine1: '',
        city: '',
        zip: ''
    });

    const handleChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            alert('Please sign in to place an order');
            navigate('/login');
            return;
        }

        setIsSubmitting(true);

        const orderData = {
            userId: user.id,
            items: cart,
            total: cartTotal,
            address
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                alert('Order placed successfully!');
                clearCart();
                navigate('/');
            } else {
                alert('Failed to place order. Please try again.');
            }
        } catch (error) {
            console.error('Order error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cart.length === 0) {
        return <div className="checkout-page"><h2>Your cart is empty</h2></div>;
    }

    return (
        <section className="checkout-page">
            <h2>Checkout</h2>
            <div className="checkout-container">
                <div className="checkout-form">
                    <h3>Shipping Address</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="fullName" value={address.fullName} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Address Line 1</label>
                            <input type="text" name="addressLine1" value={address.addressLine1} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input type="text" name="city" value={address.city} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Zip Code</label>
                            <input type="text" name="zip" value={address.zip} onChange={handleChange} required />
                        </div>
                        <button type="submit" className="place-order-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : `Place Order ($${cartTotal.toFixed(2)})`}
                        </button>
                    </form>
                </div>
                <div className="order-summary-sidebar">
                    <h3>Order Summary</h3>
                    {cart.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="summary-total">
                        <strong>Total: ${cartTotal.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Checkout;
