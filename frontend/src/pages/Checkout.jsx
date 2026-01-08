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
    const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cod'
    const [paymentError, setPaymentError] = useState(null);
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

    const initiateRazorpayPayment = async (orderData) => {
        const token = localStorage.getItem('token');

        try {
            // Create Razorpay order
            const paymentResponse = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: cartTotal,
                    orderId: orderData.id
                })
            });

            if (!paymentResponse.ok) {
                const errorData = await paymentResponse.json();
                if (errorData.configurationRequired) {
                    throw new Error('Online payments are not configured yet. Please use Cash on Delivery or contact support.');
                }
                throw new Error(errorData.message || 'Failed to create payment order');
            }

            const paymentData = await paymentResponse.json();

            // Open Razorpay checkout
            const options = {
                key: paymentData.keyId,
                amount: paymentData.amount,
                currency: paymentData.currency,
                name: 'Jewellery Cart',
                description: 'Order Payment',
                order_id: paymentData.orderId,
                handler: async function (response) {
                    // Verify payment on backend
                    try {
                        const verifyResponse = await fetch('/api/payments/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderId: orderData.id
                            })
                        });

                        if (verifyResponse.ok) {
                            alert('Payment successful! Your order has been confirmed.');
                            clearCart();
                            navigate('/');
                        } else {
                            setPaymentError('Payment verification failed. Please contact support.');
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        setPaymentError('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || ''
                },
                theme: {
                    color: '#d4af37'
                },
                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                        setPaymentError('Payment was cancelled. Your order is saved as pending.');
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', function (response) {
                setPaymentError(`Payment failed: ${response.error.description}`);
                setIsSubmitting(false);
            });
            razorpay.open();

        } catch (error) {
            console.error('Payment initiation error:', error);
            setPaymentError('Failed to initiate payment. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPaymentError(null);

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
            addressId: selectedAddressId,
            paymentMethod: paymentMethod
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to place order');
            }

            const createdOrder = await response.json();

            if (paymentMethod === 'cod') {
                // COD order placed directly
                alert('Order placed successfully! Pay on delivery.');
                clearCart();
                navigate('/');
            } else {
                // Initiate online payment
                await initiateRazorpayPayment(createdOrder);
            }
        } catch (error) {
            console.error('Order error:', error);
            alert(error.message || 'Something went wrong. Please try again.');
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

                    {/* Payment Method Selection */}
                    <div className="payment-section">
                        <h3>Payment Method</h3>
                        <div className="payment-options">
                            <label className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="online"
                                    checked={paymentMethod === 'online'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <div className="payment-option-content">
                                    <span className="payment-icon">💳</span>
                                    <div>
                                        <strong>Pay Online</strong>
                                        <p>Credit/Debit Card, UPI, Net Banking</p>
                                    </div>
                                </div>
                            </label>
                            <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="cod"
                                    checked={paymentMethod === 'cod'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <div className="payment-option-content">
                                    <span className="payment-icon">🏠</span>
                                    <div>
                                        <strong>Cash on Delivery</strong>
                                        <p>Pay when your order arrives</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {paymentError && (
                        <div className="payment-error">
                            {paymentError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                        <button
                            type="submit"
                            className="place-order-btn"
                            disabled={isSubmitting || (!selectedAddressId && !showAddForm)}
                        >
                            {isSubmitting
                                ? 'Processing...'
                                : paymentMethod === 'online'
                                    ? `Pay Now (₹${(cartTotal || 0).toFixed(2)})`
                                    : `Place Order (₹${(cartTotal || 0).toFixed(2)})`
                            }
                        </button>
                    </form>
                </div>
                <div className="order-summary-sidebar">
                    <h3>Order Summary</h3>
                    {cart.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>₹{((item.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="summary-total">
                        <strong>Total: ₹{(cartTotal || 0).toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Checkout;
