import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { getProductImageSrc } from '../utils/imageUtils';
import { calculateProductPrices } from '../utils/priceUtils';
import ProductForm from '../components/ProductForm';
import ProductImportExport from '../components/ProductImportExport';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import './SuperAdminPortal.css';

const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const isSuperUser = (user) => user?.role === 'superadmin' || (user?.roles || []).includes('superadmin');

const SuperAdminPortal = () => {
    const { user, logout } = useAuth();
    const { products, addProduct, updateProduct, deleteProduct } = useProducts();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overview, setOverview] = useState(null);
    const [productPrices, setProductPrices] = useState({});
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [metalPrices, setMetalPrices] = useState([]);
    const [liveRates, setLiveRates] = useState(null);
    const [editingMetalPrice, setEditingMetalPrice] = useState(null);
    const [editingMetalValue, setEditingMetalValue] = useState('');
    const [savingUserId, setSavingUserId] = useState(null);
    const [savingOrderId, setSavingOrderId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editFormData, setEditFormData] = useState(null);

    // Search and Pagination States
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });

    const [orderSearch, setOrderSearch] = useState('');
    const [orderPage, setOrderPage] = useState(1);
    const [orderPagination, setOrderPagination] = useState({ total: 0, totalPages: 1 });

    const [productSearch, setProductSearch] = useState('');
    const [productPage, setProductPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

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

    // Fetch prices when products change
    useEffect(() => {
        if (products && products.length > 0) {
            const productIds = products.map(p => p.id);
            calculateProductPrices(productIds).then(setProductPrices);
        }
    }, [products]);

    const bootstrap = async () => {
        setLoading(true);
        setError('');
        try {
            const [overviewRes, metalPricesRes] = await Promise.all([
                fetch('/api/admin/overview', { headers }),
                fetch('/api/admin/metal-prices', { headers })
            ]);

            if (!overviewRes.ok) throw new Error('Failed to load overview');
            if (!metalPricesRes.ok) throw new Error('Failed to load metal prices');

            const [overviewData, metalPricesData] = await Promise.all([
                overviewRes.json(),
                metalPricesRes.json()
            ]);

            setOverview(overviewData);
            setMetalPrices(metalPricesData.prices || []);
            setLiveRates(metalPricesData.liveRates || null);

            // Fetch paginated data
            await Promise.all([
                fetchUsers(),
                fetchOrders()
            ]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async (page = userPage, search = userSearch) => {
        try {
            const params = new URLSearchParams({ page, limit: ITEMS_PER_PAGE, search });
            const res = await fetch(`/api/admin/users?${params}`, { headers });
            if (!res.ok) throw new Error('Failed to load users');
            const data = await res.json();
            setUsers(data.users || []);
            setUserPagination(data.pagination || { total: 0, totalPages: 1 });
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchOrders = async (page = orderPage, search = orderSearch) => {
        try {
            const params = new URLSearchParams({ page, limit: ITEMS_PER_PAGE, search });
            const res = await fetch(`/api/admin/orders?${params}`, { headers });
            if (!res.ok) throw new Error('Failed to load orders');
            const data = await res.json();
            setOrders(data.orders || []);
            setOrderPagination(data.pagination || { total: 0, totalPages: 1 });
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle user search
    const handleUserSearch = (search) => {
        setUserSearch(search);
        setUserPage(1);
        fetchUsers(1, search);
    };

    // Handle order search
    const handleOrderSearch = (search) => {
        setOrderSearch(search);
        setOrderPage(1);
        fetchOrders(1, search);
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

    // Handle metal price update
    const handleUpdateMetalPrice = async (metalId, metal, newPrice) => {
        if (!newPrice || newPrice <= 0) {
            setMessage({ type: 'error', text: 'Price must be greater than 0' });
            return;
        }

        setEditingMetalPrice(null);
        setError('');
        try {
            const res = await fetch(`/api/admin/metal-prices/${metal}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ pricePerGram: parseFloat(newPrice) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update metal price');

            // Update local state
            setMetalPrices(prev => prev.map(m => m.metal === metal ? { ...m, pricePerGram: parseFloat(newPrice) } : m));
            setMessage({ type: 'success', text: `${metal.toUpperCase()} price updated successfully!` });

            // Reload page to refresh prices throughout the application
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            setError(err.message);
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleEditMetalPrice = (metal, currentPrice) => {
        setEditingMetalPrice(metal.metal);
        setEditingMetalValue(currentPrice.toString());
    };

    // Fetch product + inventory data for editing
    const handleEditClick = async (product) => {
        try {
            setMessage({ type: '', text: '' });

            // Fetch inventory details for this product
            const invResponse = await fetch(`/api/inventory/product/${product.id}`);
            const invData = await invResponse.json();

            const inventory = invData.success && invData.item ? invData.item : {};

            // Combine product and inventory data
            const formData = {
                name: product.name,
                description: product.description,
                image: product.imageUrl || product.image || '',
                price: product.price,
                stock: product.stock || 0,
                // Jewelry specs from inventory
                metal: inventory.metal || '',
                metalPrice: inventory.metalPrice || 0,
                hallmarked: inventory.hallmarked === 1,
                purity: inventory.purity ? String(inventory.purity) : '',
                netWeight: inventory.netWeight ? String(inventory.netWeight) : '',
                extraDescription: inventory.extraDescription || '',
                extraWeight: inventory.extraWeight ? String(inventory.extraWeight) : '',
                extraValue: inventory.extraValue ? String(inventory.extraValue) : '',
                grossWeight: inventory.grossWeight ? String(inventory.grossWeight) : '',
                type: inventory.type || 'Normal',
                ornament: inventory.ornament || '',
                customOrnament: inventory.customOrnament || '',
                wastagePercent: inventory.wastagePercent ? String(inventory.wastagePercent) : '10',
                makingChargePerGram: inventory.makingChargePerGram ? String(inventory.makingChargePerGram) : '',
                inventoryImage: inventory.image || ''
            };

            setEditingProduct(product);
            setEditFormData(formData);
            setShowProductForm(true);
        } catch (err) {
            console.error('Error fetching product data:', err);
            setMessage({ type: 'error', text: 'Failed to load product data for editing' });
        }
    };

    const handleProductSubmit = async (productData) => {
        try {
            setIsSubmitting(true);
            setMessage({ type: '', text: '' });

            if (editingProduct) {
                // UPDATE existing product
                const result = await updateProduct(editingProduct.id, {
                    name: productData.name,
                    description: productData.description,
                    price: productData.price,
                    image: productData.image,
                    imageUrl: productData.imageUrl,
                    stock: productData.stock
                });

                if (result.success) {
                    // Check if inventory exists and update or create
                    const invCheckResponse = await fetch(`/api/inventory/product/${editingProduct.id}`);
                    const invCheckData = await invCheckResponse.json();

                    if (invCheckData.success && invCheckData.item) {
                        // Update existing inventory
                        const inventoryResponse = await fetch(`/api/inventory/${invCheckData.item.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                metal: productData.metal,
                                metalPrice: productData.metalPrice,
                                hallmarked: productData.hallmarked,
                                purity: productData.purity,
                                netWeight: productData.netWeight,
                                extraDescription: productData.extraDescription,
                                extraWeight: productData.extraWeight,
                                extraValue: productData.extraValue,
                                grossWeight: productData.grossWeight,
                                type: productData.type,
                                ornament: productData.ornament,
                                customOrnament: productData.customOrnament,
                                wastagePercent: productData.wastagePercent,
                                makingChargePerGram: productData.makingChargePerGram
                            })
                        });
                        setMessage({ type: 'success', text: 'Product updated successfully!' });
                    } else {
                        setMessage({ type: 'success', text: 'Product updated successfully!' });
                    }
                } else {
                    setMessage({ type: 'error', text: result.message || 'Failed to update product' });
                }
            } else {
                // CREATE new product
                const result = await addProduct({
                    name: productData.name,
                    description: productData.description,
                    price: productData.price,
                    image: productData.image,
                    imageUrl: productData.imageUrl,
                    stock: productData.stock
                });

                if (result.success) {
                    // Try to add inventory if jewelry specs provided
                    if (productData.metal && productData.netWeight && productData.grossWeight) {
                        const inventoryResponse = await fetch('/api/inventory/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                productId: result.productId,
                                metal: productData.metal,
                                metalPrice: productData.metalPrice,
                                hallmarked: productData.hallmarked,
                                purity: productData.purity,
                                netWeight: productData.netWeight,
                                extraDescription: productData.extraDescription,
                                extraWeight: productData.extraWeight || 0,
                                extraValue: productData.extraValue || 0,
                                grossWeight: productData.grossWeight,
                                type: productData.type,
                                ornament: productData.ornament,
                                customOrnament: productData.customOrnament,
                                wastagePercent: productData.wastagePercent,
                                makingChargePerGram: productData.makingChargePerGram,
                                totalMakingCharge: 0,
                                totalPrice: productData.price
                            })
                        });

                        const inventoryResult = await inventoryResponse.json();

                        if (inventoryResult.success) {
                            setMessage({ type: 'success', text: 'Product created successfully with all specifications!' });
                        } else {
                            setMessage({ type: 'warning', text: 'Product created but inventory details failed. Please add inventory separately.' });
                        }
                    } else {
                        setMessage({ type: 'success', text: 'Product created successfully!' });
                    }
                } else {
                    setMessage({ type: 'error', text: result.message || 'Failed to create product' });
                }
            }

            setShowProductForm(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error saving product' });
            console.error('Error submitting product:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelForm = () => {
        setShowProductForm(false);
        setEditingProduct(null);
        setEditFormData(null);
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product and all its inventory details?')) return;

        try {
            const result = await deleteProduct(id);
            if (result.success) {
                try {
                    const response = await fetch(`/api/inventory/product/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    const invResult = await response.json();
                } catch (err) {
                    // Inventory deletion might fail if no inventory exists, which is ok
                }
                setMessage({ type: 'success', text: 'Product deleted successfully!' });
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to delete product' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error deleting product' });
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
            {message.text && (
                <div className={`card ${message.type}`}>
                    {message.text}
                </div>
            )}

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

            {/* Metal Prices Section */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Pricing Control</p>
                        <h3>💰 Metal Prices (per gram)</h3>
                    </div>
                    <button className="ghost" onClick={() => { setEditingMetalPrice(null); bootstrap(); }}>Refresh</button>
                </div>

                {/* Live Rates Reference */}
                {liveRates && (liveRates.gold || liveRates.silver) && (
                    <div className="live-rates-info">
                        <p className="live-rates-label">📊 Live Market Rates (Reference):</p>
                        <div className="live-rates-values">
                            {liveRates.gold && <span>Gold: ₹{liveRates.gold.toFixed(2)}/g</span>}
                            {liveRates.silver && <span>Silver: ₹{liveRates.silver.toFixed(2)}/g</span>}
                        </div>
                    </div>
                )}

                <div className="metal-prices-grid">
                    {metalPrices.length > 0 ? (
                        metalPrices.map(metal => (
                            <div key={metal.metal} className="metal-price-item">
                                <div className="metal-header">
                                    <h4 className="metal-name">{metal.metal.charAt(0).toUpperCase() + metal.metal.slice(1)}</h4>
                                    {editingMetalPrice === metal.metal ? (
                                        <div className="metal-edit-actions">
                                            <button
                                                className="save-btn"
                                                onClick={() => handleUpdateMetalPrice(metal.id, metal.metal, editingMetalValue)}
                                            >
                                                ✓ Save
                                            </button>
                                            <button
                                                className="cancel-btn"
                                                onClick={() => setEditingMetalPrice(null)}
                                            >
                                                ✗ Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEditMetalPrice(metal, metal.pricePerGram)}
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>
                                {editingMetalPrice === metal.metal ? (
                                    <input
                                        type="number"
                                        value={editingMetalValue}
                                        onChange={(e) => setEditingMetalValue(e.target.value)}
                                        className="metal-price-input"
                                        placeholder="Enter price"
                                        min="0"
                                        step="0.01"
                                    />
                                ) : (
                                    <p className="metal-price">₹{parseFloat(metal.pricePerGram).toFixed(2)}</p>
                                )}
                                <p className="metal-updated">Updated: {new Date(metal.updatedAt).toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <p className="muted">No metal prices found</p>
                    )}
                </div>
            </div>

            <div className="grid two">
                <div className="card">
                    <div className="section-header">
                        <div>
                            <p className="eyebrow">Sellers & Buyers</p>
                            <h3>People ({userPagination.total})</h3>
                        </div>
                        <button className="ghost" onClick={() => fetchUsers(1, userSearch)}>Refresh</button>
                    </div>
                    <div className="search-row">
                        <SearchInput
                            placeholder="Search users by name or email..."
                            onSearch={handleUserSearch}
                            value={userSearch}
                        />
                    </div>
                    <div className="table">
                        <div className="row head">
                            <div>Name</div>
                            <div>Email</div>
                            <div>Role</div>
                            <div>Actions</div>
                        </div>
                        {users.length === 0 ? (
                            <div className="row"><div className="muted">No users found</div></div>
                        ) : users.map((u) => (
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
                    {userPagination.totalPages > 1 && (
                        <Pagination
                            currentPage={userPage}
                            totalPages={userPagination.totalPages}
                            onPageChange={(page) => { setUserPage(page); fetchUsers(page, userSearch); }}
                        />
                    )}
                </div>

                <div className="card">
                    <div className="section-header">
                        <div>
                            <p className="eyebrow">Orders</p>
                            <h3>Pipeline ({orderPagination.total})</h3>
                        </div>
                        <button className="ghost" onClick={() => fetchOrders(1, orderSearch)}>Refresh</button>
                    </div>
                    <div className="search-row">
                        <SearchInput
                            placeholder="Search orders by ID or customer..."
                            onSearch={handleOrderSearch}
                            value={orderSearch}
                        />
                    </div>
                    <div className="table">
                        <div className="row head">
                            <div>Order</div>
                            <div>Buyer</div>
                            <div>Status</div>
                            <div>Value</div>
                        </div>
                        {orders.length === 0 ? (
                            <div className="row"><div className="muted">No orders found</div></div>
                        ) : orders.map((o) => (
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
                    {orderPagination.totalPages > 1 && (
                        <Pagination
                            currentPage={orderPage}
                            totalPages={orderPagination.totalPages}
                            onPageChange={(page) => { setOrderPage(page); fetchOrders(page, orderSearch); }}
                        />
                    )}
                </div>
            </div>

            <div className="card admin-products-section">
                <div className="section-header-row">
                    <div>
                        <p className="eyebrow">Inventory</p>
                        <h3>💎 All Products</h3>
                    </div>
                    <button
                        className="ghost"
                        onClick={() => {
                            if (showProductForm && !editingProduct) {
                                handleCancelForm();
                            } else {
                                setEditingProduct(null);
                                setEditFormData(null);
                                setShowProductForm(true);
                            }
                        }}
                    >
                        {showProductForm && !editingProduct ? 'Cancel' : '+ Add New Product'}
                    </button>
                </div>

                {showProductForm && (
                    <div className="form-container">
                        <h4>{editingProduct ? `✏️ Editing: ${editingProduct.name}` : '➕ Add New Product'}</h4>
                        <ProductForm
                            onSubmit={handleProductSubmit}
                            initialData={editFormData}
                            isLoading={isSubmitting}
                            onCancel={handleCancelForm}
                        />
                    </div>
                )}

                {/* Import/Export Section */}
                <ProductImportExport onImportSuccess={() => window.location.reload()} />

                {/* Product Search */}
                <div className="search-row">
                    <SearchInput
                        placeholder="Search products by name..."
                        onSearch={setProductSearch}
                        value={productSearch}
                    />
                    <span className="muted">Showing {(() => {
                        const filtered = products.filter(p =>
                            p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.description?.toLowerCase().includes(productSearch.toLowerCase())
                        );
                        const start = (productPage - 1) * ITEMS_PER_PAGE;
                        const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);
                        return `${paginated.length} of ${filtered.length}`;
                    })()} products</span>
                </div>

                <div className="products-list">
                    {(() => {
                        const filtered = products.filter(p =>
                            p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.description?.toLowerCase().includes(productSearch.toLowerCase())
                        );
                        const totalFilteredPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                        const start = (productPage - 1) * ITEMS_PER_PAGE;
                        const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

                        return (
                            <>
                                {paginated.length === 0 ? (
                                    <p className="no-products">No products found.</p>
                                ) : (
                                    <div className="product-grid">
                                        {paginated.map(product => (
                                            <div key={product.id} className="product-card">
                                                <span className="product-id-badge">#{product.id}</span>
                                                <div className="product-image">
                                                    <img src={getProductImageSrc(product)} alt={product.name} />
                                                </div>
                                                <div className="product-details">
                                                    <h4>{product.name}</h4>
                                                    <p className="product-price">₹{(productPrices[product.id] || 0).toFixed(2)}</p>
                                                    <p className="product-description">{product.description?.substring(0, 100) || 'No description'}...</p>
                                                    {product.sellerId && (
                                                        <span className="seller-badge">👤 Seller Product</span>
                                                    )}
                                                </div>
                                                <div className="product-actions">
                                                    <button
                                                        onClick={() => handleEditClick(product)}
                                                        className="edit-product-btn"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="delete-product-btn"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {totalFilteredPages > 1 && (
                                    <Pagination
                                        currentPage={productPage}
                                        totalPages={totalFilteredPages}
                                        onPageChange={setProductPage}
                                    />
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </section>
    );
};

export default SuperAdminPortal;
