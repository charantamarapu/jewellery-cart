import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import './Orders.css';

const ITEMS_PER_PAGE = 5;

const Orders = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Check if user is admin
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roles && (user.roles.includes('admin') || user.roles.includes('superadmin')));

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchOrders();
    }, [user, navigate]);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            } else {
                setError('Failed to fetch orders');
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Error loading orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status, paymentStatus) => {
        const statusClasses = {
            'pending': 'status-pending',
            'confirmed': 'status-confirmed',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };

        const paymentClasses = {
            'pending': 'payment-pending',
            'paid': 'payment-paid',
            'cod': 'payment-cod',
            'failed': 'payment-failed'
        };

        return (
            <div className="status-badges">
                <span className={`status-badge ${statusClasses[status] || ''}`}>
                    {status?.charAt(0).toUpperCase() + status?.slice(1)}
                </span>
                <span className={`payment-badge ${paymentClasses[paymentStatus] || ''}`}>
                    {paymentStatus === 'cod' ? 'Cash on Delivery' :
                        paymentStatus === 'paid' ? 'Paid' :
                            paymentStatus === 'pending' ? 'Payment Pending' : paymentStatus}
                </span>
            </div>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) {
        return null;
    }

    const pageTitle = isAdmin ? 'All Orders' : 'My Orders';

    // Filter orders by search
    const filteredOrders = orders.filter(order => {
        const searchLower = search.toLowerCase();
        const orderId = String(order.id);
        const customerName = order.userName?.toLowerCase() || '';
        const customerEmail = order.userEmail?.toLowerCase() || '';
        const items = order.items?.map(i => i.name?.toLowerCase()).join(' ') || '';

        return orderId.includes(searchLower) ||
            customerName.includes(searchLower) ||
            customerEmail.includes(searchLower) ||
            items.includes(searchLower);
    });

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    if (loading) {
        return (
            <section className="orders-page">
                <h2>{pageTitle}</h2>
                <div className="loading">Loading orders...</div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="orders-page">
                <h2>{pageTitle}</h2>
                <div className="error-message">{error}</div>
            </section>
        );
    }

    return (
        <section className="orders-page">
            <h2>{pageTitle}</h2>
            {isAdmin && <p className="admin-note">Viewing all customer orders</p>}

            {orders.length > 0 && (
                <div className="search-row">
                    <SearchInput
                        placeholder="Search by order ID, customer, or product..."
                        onSearch={(val) => { setSearch(val); setPage(1); }}
                        value={search}
                    />
                    <span className="muted">{filteredOrders.length} orders</span>
                </div>
            )}

            {paginatedOrders.length === 0 ? (
                <div className="no-orders">
                    <div className="empty-icon">📦</div>
                    <h3>{search ? 'No matching orders' : 'No orders yet'}</h3>
                    <p>{search ? 'Try a different search term' :
                        isAdmin ? 'No orders have been placed yet.' : "You haven't placed any orders. Start shopping now!"}</p>
                    {!isAdmin && !search && <Link to="/products" className="shop-now-btn">Browse Products</Link>}
                </div>
            ) : (
                <>
                    <div className="orders-list">
                        {paginatedOrders.map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-header">
                                    <div className="order-info">
                                        <span className="order-id">Order #{order.id}</span>
                                        <span className="order-date">{formatDate(order.date)}</span>
                                        {isAdmin && order.userName && (
                                            <span className="customer-info">
                                                👤 {order.userName} ({order.userEmail})
                                            </span>
                                        )}
                                    </div>
                                    {getStatusBadge(order.status, order.paymentStatus)}
                                </div>

                                <div className="order-items">
                                    {order.items?.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-image">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} />
                                                ) : (
                                                    <div className="no-image">💎</div>
                                                )}
                                            </div>
                                            <div className="item-details">
                                                <span className="item-name">{item.name}</span>
                                                <span className="item-quantity">Qty: {item.quantity}</span>
                                            </div>
                                            <div className="item-price">
                                                ₹{((item.price || 0) * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-footer">
                                    <div className="shipping-address">
                                        <strong>Shipping to:</strong>
                                        <span>
                                            {order.address?.fullName}, {order.address?.addressLine1},
                                            {order.address?.city} - {order.address?.zip}
                                        </span>
                                    </div>
                                    {order.transactionId && (
                                        <div className="transaction-info">
                                            <strong>Transaction ID:</strong>
                                            <span className="txn-id">{order.transactionId}</span>
                                        </div>
                                    )}
                                    <div className="order-total">
                                        <strong>Total: ₹{(order.total || 0).toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    )}
                </>
            )}
        </section>
    );
};

export default Orders;
