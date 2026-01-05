import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AccountSettings.css';

const AccountSettings = () => {
    const { user, becomeSeller } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
        }
    }, [user, navigate]);

    if (!user) {
        return null;
    }

    const isSeller = user.role === 'seller' || (user.roles && user.roles.includes('seller'));

    const handleBecomeSeller = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await becomeSeller();
        if (result.success) {
            setMessage({ type: 'success', text: 'You are now a seller! You can manage products from the seller dashboard.' });
            setTimeout(() => {
                navigate('/seller-dashboard');
            }, 2000);
        } else {
            setMessage({ type: 'error', text: result.message || 'Failed to upgrade to seller' });
        }
        setLoading(false);
    };

    return (
        <section className="account-settings-page">
            <div className="settings-container">
                <h2>Account Settings</h2>

                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="settings-section">
                    <h3>Your Account</h3>
                    <div className="account-info">
                        <div className="info-item">
                            <label>Name:</label>
                            <span>{user.name}</span>
                        </div>
                        <div className="info-item">
                            <label>Email:</label>
                            <span>{user.email}</span>
                        </div>
                        <div className="info-item">
                            <label>Account Type:</label>
                            <span className="role-badge">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                        </div>
                    </div>
                </div>

                {!isSeller && (
                    <div className="settings-section">
                        <h3>Become a Seller</h3>
                        <p className="seller-description">
                            Interested in selling jewellery? Upgrade your account to seller status and start listing your products.
                        </p>
                        <ul className="seller-benefits">
                            <li>✓ List unlimited products</li>
                            <li>✓ Manage your inventory</li>
                            <li>✓ Access seller dashboard</li>
                            <li>✓ View sales analytics</li>
                        </ul>
                        <button
                            className="become-seller-btn"
                            onClick={handleBecomeSeller}
                            disabled={loading}
                        >
                            {loading ? 'Upgrading...' : 'Become a Seller'}
                        </button>
                    </div>
                )}

                {isSeller && (
                    <div className="settings-section">
                        <h3>Seller Status</h3>
                        <p className="seller-status-text">
                            You are a registered seller. You can manage your products from the seller dashboard.
                        </p>
                        <a href="/seller-dashboard" className="seller-dashboard-link">
                            Go to Seller Dashboard →
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AccountSettings;
