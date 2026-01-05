import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SuperAdminPortal.css';

const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const isSuperUser = (user) => user?.role === 'superadmin' || (user?.roles || []).includes('superadmin');

const SuperAdminPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overview, setOverview] = useState(null);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [savingUserId, setSavingUserId] = useState(null);
    const [savingOrderId, setSavingOrderId] = useState(null);
    const [savingProductId, setSavingProductId] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', image: '', stock: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', price: '', description: '', image: '', stock: '' });

    const headers = useMemo(() => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    }, []);

    useEffect(() => {
        if (!isSuperUser(user)) {
            navigate('/login');
            return;
        }
        bootstrap();
    }, [user]);

    const bootstrap = async () => {
        setLoading(true);
        setError('');
        try {
            const [overviewRes, usersRes, ordersRes, inventoryRes] = await Promise.all([
                fetch('/api/admin/overview', { headers }),
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/orders', { headers }),
                fetch('/api/admin/inventory', { headers })
            ]);

            if (!overviewRes.ok) throw new Error('Failed to load overview');
            if (!usersRes.ok) throw new Error('Failed to load users');
            if (!ordersRes.ok) throw new Error('Failed to load orders');
            if (!inventoryRes.ok) throw new Error('Failed to load inventory');

            const [overviewData, usersData, ordersData, inventoryData] = await Promise.all([
                overviewRes.json(),
                usersRes.json(),
                ordersRes.json(),
                inventoryRes.json()
            ]);

            setOverview(overviewData);
            setUsers(usersData);
            setOrders(ordersData);
            setInventory(inventoryData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId, role) => {
        setSavingUserId(userId);
        setError('');
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ role, roles: [role] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update role');
            setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
            
            // If current user's role was changed, force re-login
            if (user.id === userId) {
                alert('Your role has been changed. Please log in again.');
                logout();
                navigate('/login');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingUserId(null);
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Delete this user? All their data (orders, addresses, products) will be removed.')) return;
        setSavingUserId(userId);
        setError('');
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete user');
            }
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingUserId(null);
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        setSavingOrderId(orderId);
        setError('');
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update order');
            setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)));
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingOrderId(null);
        }
    };

    const createProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            setError('Name and price are required');
            return;
        }
        setSavingProductId('new');
        setError('');
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...newProduct,
                    price: Number(newProduct.price),
                    image: newProduct.image || 'https://via.placeholder.com/150'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create product');
            setNewProduct({ name: '', price: '', description: '', image: '', stock: '' });
            setInventory((prev) => [data, ...prev]);
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingProductId(null);
        }
    };

    const startEdit = (product) => {
        setEditingId(product.id);
        setEditData({
            name: product.name || '',
            price: product.price || '',
            description: product.description || '',
            image: product.image || '',
            stock: product.stock !== undefined ? product.stock : 0
        });
    };

    const saveEdit = async (productId) => {
        if (!editData.name || !editData.price) {
            setError('Name and price are required');
            return;
        }
        setSavingProductId(productId);
        setError('');
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    ...editData,
                    price: Number(editData.price)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update product');
            setInventory((prev) => prev.map((p) => (p.id === productId ? data : p)));
            setEditingId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingProductId(null);
        }
    };

    const deleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        setSavingProductId(productId);
        setError('');
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete product');
            }
            setInventory((prev) => prev.filter((p) => p.id !== productId));
            if (editingId === productId) setEditingId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingProductId(null);
        }
    };

    if (loading) {
        return <div className="super-admin-page"><div className="card muted">Loading super admin portal...</div></div>;
    }

    if (!isSuperUser(user)) {
        return null;
    }

    return (
        <section className="super-admin-page">
            <header className="page-header">
                <div>
                    <p className="eyebrow">Superuser Control Room</p>
                    <h1>Central Command</h1>
                    <p className="lede">Regulate buyers, sellers, inventory, and orders in one place.</p>
                </div>
                <div className="badge">Super Admin</div>
            </header>

            {error && <div className="card error">{error}</div>}

            {overview && (
                <div className="grid stats">
                    <div className="card stat">
                        <p className="label">Users</p>
                        <p className="value">{overview.users}</p>
                    </div>
                    <div className="card stat">
                        <p className="label">Sellers</p>
                        <p className="value">{overview.sellers}</p>
                    </div>
                    <div className="card stat">
                        <p className="label">Admins</p>
                        <p className="value">{overview.admins}</p>
                    </div>
                    <div className="card stat">
                        <p className="label">Products</p>
                        <p className="value">{overview.products}</p>
                    </div>
                    <div className="card stat">
                        <p className="label">Orders</p>
                        <p className="value">{overview.orders}</p>
                    </div>
                </div>
            )}

            <div className="grid two">
                <div className="card">
                    <div className="section-header">
                        <div>
                            <p className="eyebrow">Sellers & Buyers</p>
                            <h3>People</h3>
                        </div>
                        <button className="ghost" onClick={bootstrap}>Refresh</button>
                    </div>
                    <div className="table">
                        <div className="row head">
                            <div>Name</div>
                            <div>Email</div>
                            <div>Role</div>
                            <div>Actions</div>
                        </div>
                        {users.map((u) => (
                            <div key={u.id} className="row">
                                <div>
                                    <div className="title">{u.name}</div>
                                    <div className="muted small">{new Date(u.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="muted">{u.email}</div>
                                <div>
                                    <span className="pill">{u.role}</span>
                                </div>
                                <div className="inline-actions">
                                    <select
                                        value={u.role}
                                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                                        disabled={savingUserId === u.id || u.role === 'superadmin'}
                                        title={u.role === 'superadmin' ? 'Super admin role cannot be changed' : ''}
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="seller">Seller</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        className="ghost danger"
                                        onClick={() => deleteUser(u.id)}
                                        disabled={savingUserId === u.id || u.id === user.id}
                                        title={u.id === user.id ? 'Cannot delete yourself' : 'Delete user'}
                                    >
                                        {savingUserId === u.id ? '...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="section-header">
                        <div>
                            <p className="eyebrow">Orders</p>
                            <h3>Pipeline</h3>
                        </div>
                        <button className="ghost" onClick={bootstrap}>Refresh</button>
                    </div>
                    <div className="table">
                        <div className="row head">
                            <div>Order</div>
                            <div>Buyer</div>
                            <div>Status</div>
                            <div>Value</div>
                        </div>
                        {orders.map((o) => (
                            <div key={o.id} className="row">
                                <div>
                                    <div className="title">#{o.id}</div>
                                    <div className="muted small">{new Date(o.date).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="title">{o.customerName || 'Unknown'}</div>
                                    <div className="muted small">{o.customerEmail || 'n/a'}</div>
                                </div>
                                <div>
                                    <select
                                        value={o.status}
                                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                                        disabled={savingOrderId === o.id}
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="title">₹{Number(o.total || 0).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Inventory</p>
                        <h3>Products</h3>
                    </div>
                    <button className="ghost" onClick={bootstrap}>Refresh</button>
                </div>
                <div className="inventory-grid">
                    {inventory.map((product) => (
                        <div key={product.id} className="inventory-card">
                            <div className="inventory-meta">
                                <p className="muted small">#{product.id}</p>
                                {product.sellerName && (
                                    <p className="muted small">Seller: {product.sellerName} ({product.sellerEmail || '—'})</p>
                                )}
                            </div>
                            {editingId === product.id ? (
                                <div className="edit-block">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={editData.price}
                                        onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Stock"
                                        value={editData.stock}
                                        onChange={(e) => setEditData({ ...editData, stock: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Image URL"
                                        value={editData.image}
                                        onChange={(e) => setEditData({ ...editData, image: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="Description"
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    />
                                    <div className="inline-actions">
                                        <button
                                            onClick={() => saveEdit(product.id)}
                                            disabled={savingProductId === product.id}
                                        >
                                            {savingProductId === product.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button className="ghost" onClick={() => setEditingId(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h4>{product.name}</h4>
                                    <p className="muted">{product.description || 'No description provided.'}</p>
                                    <div className="inventory-footer">
                                        <span className="pill">₹{Number(product.price || 0).toFixed(2)}</span>
                                        <span className={`stock-badge ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}`}>
                                            Stock: {product.stock || 0}
                                        </span>
                                    </div>
                                    <div className="inventory-footer">
                                        <span className="muted small">Added {new Date(product.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="inline-actions">
                                        <button className="ghost" onClick={() => startEdit(product)}>Edit</button>
                                        <button
                                            className="ghost danger"
                                            onClick={() => deleteProduct(product.id)}
                                            disabled={savingProductId === product.id}
                                        >
                                            {savingProductId === product.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SuperAdminPortal;
