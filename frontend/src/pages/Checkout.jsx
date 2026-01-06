import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [address, setAddress] = useState({
        fullName: '',
        addressLine1: '',
        city: '',
        zip: ''
    });

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // Load saved addresses
    useEffect(() => {
        if (user) {
            fetchSavedAddresses();
        }
    }, [user]);

    const handleChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const fetchSavedAddresses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/addresses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSavedAddresses(data);
                if (data.length > 0) {
                    setSelectedAddressId(data[0].id);
                    setShowAddForm(false);
                }
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        if (!address.fullName || !address.addressLine1 || !address.city || !address.zip) {
            alert('Please fill all fields');
            return;
        }

        setIsAddingAddress(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(address)
            });

            if (response.ok) {
                const newAddress = await response.json();
                setSavedAddresses([...savedAddresses, newAddress]);
                setSelectedAddressId(newAddress.id);
                setAddress({ fullName: '', addressLine1: '', city: '', zip: '' });
                setShowAddForm(false);
            } else {
                alert('Failed to save address');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            alert('Error saving address');
        } finally {
            setIsAddingAddress(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            alert('Please sign in to place an order');
            navigate('/login');
            return;
        }

        if (!selectedAddressId && !showAddForm) {
            alert('Please select or add an address');
            return;
        }

        setIsSubmitting(true);

        const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
        const orderAddress = selectedAddr || address;

        const orderData = {
            userId: user.id,
            items: cart,
            total: cartTotal,
            address: orderAddress,
            addressId: selectedAddressId
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm('Are you sure you want to delete this address?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setSavedAddresses(savedAddresses.filter(a => a.id !== addressId));
                if (selectedAddressId === addressId) {
                    setSelectedAddressId(null);
                }
                alert('Address deleted successfully');
            } else {
                alert('Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            alert('Error deleting address');
        }
    };

    if (cart.length === 0) {
        return <div className="checkout-page"><h2>Your cart is empty</h2></div>;
    }

    if (!user) {
        return null; // Redirect is handled by useEffect
    }

    return (
        <section className="checkout-page">
            <h2>Checkout</h2>
            <div className="checkout-container">
                <div className="checkout-form">
                    <div className="address-section">
                        <h3>Shipping Address</h3>
                        
                        {savedAddresses.length > 0 && !showAddForm && (
                            <div className="address-options">
                                {savedAddresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        className={`address-option ${selectedAddressId === addr.id ? 'selected' : ''}`}
                                    >
                                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedAddressId(addr.id)}>
                                            <label className="address-label">
                                                <input
                                                    type="radio"
                                                    checked={selectedAddressId === addr.id}
                                                    onChange={() => setSelectedAddressId(addr.id)}
                                                />
                                                <span>{addr.fullName}</span>
                                            </label>
                                            <div className="address-details">
                                                {addr.addressLine1}<br />
                                                {addr.city}, {addr.zip}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAddress(addr.id)}
                                            className="delete-address-btn"
                                            title="Delete this address"
                                            style={{ 
                                                background: '#ff4444', 
                                                color: 'white', 
                                                border: 'none', 
                                                padding: '0.5rem 1rem', 
                                                borderRadius: '4px', 
                                                cursor: 'pointer',
                                                marginLeft: '0.5rem',
                                                minWidth: '80px'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showAddForm ? (
                            <form onSubmit={handleAddAddress} className="address-form">
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
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="submit" className="place-order-btn" style={{ marginTop: 0 }} disabled={isAddingAddress}>
                                        {isAddingAddress ? 'Saving...' : 'Save Address'}
                                    </button>
                                    <button
                                        type="button"
                                        className="place-order-btn"
                                        style={{ marginTop: 0, backgroundColor: '#ddd', border: '1px solid #ccc' }}
                                        onClick={() => setShowAddForm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                type="button"
                                className="add-new-address-btn"
                                onClick={() => setShowAddForm(true)}
                            >
                                + Add New Address
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                        <button type="submit" className="place-order-btn" disabled={isSubmitting || (!selectedAddressId && !showAddForm)}>
                            {isSubmitting ? 'Processing...' : `Place Order (₹${cartTotal.toFixed(2)})`}
                        </button>
                    </form>
                </div>
                <div className="order-summary-sidebar">
                    <h3>Order Summary</h3>
                    {cart.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="summary-total">
                        <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Checkout;
