import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import ProductImportExport from '../components/ProductImportExport';
import { getProductImageSrc } from '../utils/imageUtils';
import { calculateProductPrices } from '../utils/priceUtils';
import './AdminDashboard.css';

const SellerDashboard = () => {
    const { products, addProduct, updateProduct, deleteProduct, fetchSellerProducts } = useProducts();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sellerProducts, setSellerProducts] = useState([]);
    const [productPrices, setProductPrices] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editFormData, setEditFormData] = useState(null);

    useEffect(() => {
        if (!user || (user.role !== 'seller' && user.role !== 'admin' && (!user.roles || !user.roles.includes('seller')))) {
            navigate('/login');
            return;
        }
        loadProducts();
    }, [user, navigate]);

    const loadProducts = async () => {
        const products = await fetchSellerProducts();
        setSellerProducts(products);
        
        // Fetch prices for all products
        if (products && products.length > 0) {
            const productIds = products.map(p => p.id);
            const prices = await calculateProductPrices(productIds);
            setProductPrices(prices);
        }
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
            await loadProducts();
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
                await loadProducts();
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to delete product' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error deleting product' });
        }
    };

    return (
        <section className="admin-page">
            <h2>Seller Dashboard</h2>
            <p className="welcome-text">Welcome, {user?.name}! Manage your jewelry products here.</p>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="admin-content">
                <div className="products-section">
                    <div className="section-header-row">
                        <h3>💎 Jewelry Products</h3>
                        <button
                            className="add-product-btn"
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
                    <ProductImportExport onImportSuccess={loadProducts} />

                    <div className="products-list">
                        {sellerProducts.length === 0 ? (
                            <p className="no-products">No products yet. Create your first jewelry product!</p>
                        ) : (
                            <div className="product-grid">
                                {sellerProducts.map(product => (
                                    <div key={product.id} className="product-card">
                                        <div className="product-image">
                                            <img src={getProductImageSrc(product)} alt={product.name} />
                                        </div>
                                        <div className="product-details">
                                            <h4>{product.name}</h4>
                                            <p className="product-price">₹{(productPrices[product.id] || 0).toFixed(2)}</p>
                                            <p className="product-description">{product.description?.substring(0, 100) || 'No description'}...</p>
                                            <div className="stock-info">
                                                <span className="stock-badge">📦 Stock: {product.stock || 0}</span>
                                            </div>
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
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SellerDashboard;
