import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const SellerDashboard = () => {
    const { addProduct, updateProduct, deleteProduct, fetchSellerProducts } = useProducts();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sellerProducts, setSellerProducts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        image: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
            navigate('/login');
            return;
        }
        loadProducts();
    }, [user, navigate]);

    const loadProducts = async () => {
        const products = await fetchSellerProducts();
        setSellerProducts(products);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            setMessage({ type: 'error', text: 'Name and price are required' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        const productData = {
            ...formData,
            price: parseFloat(formData.price),
            image: formData.image || 'https://via.placeholder.com/150'
        };

        let result;
        if (editingProduct) {
            result = await updateProduct(editingProduct.id, productData);
        } else {
            result = await addProduct(productData);
        }

        if (result.success) {
            setFormData({ name: '', price: '', description: '', image: '' });
            setEditingProduct(null);
            setMessage({ type: 'success', text: editingProduct ? 'Product updated successfully!' : 'Product added successfully!' });
            await loadProducts();
        } else {
            setMessage({ type: 'error', text: result.message || 'Failed to save product' });
        }
        setIsSubmitting(false);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.image
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setFormData({ name: '', price: '', description: '', image: '' });
        setMessage({ type: '', text: '' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        const result = await deleteProduct(id);
        if (result.success) {
            setMessage({ type: 'success', text: 'Product deleted successfully!' });
            await loadProducts();
        } else {
            setMessage({ type: 'error', text: result.message || 'Failed to delete product' });
        }
    };

    return (
        <section className="admin-page seller-dashboard">
            <h2>Seller Dashboard</h2>
            <p className="welcome-text">Welcome, {user?.name}! Manage your products below.</p>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="admin-content">
                <div className="add-product-section">
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <form onSubmit={handleSubmit} className="admin-form">
                        <div className="form-group">
                            <label>Product Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Price</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} required step="0.01" />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Image URL</label>
                            <input type="text" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
                        </div>
                        <div className="form-actions">
                            <button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
                            </button>
                            {editingProduct && (
                                <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="product-list-section">
                    <h3>My Products ({sellerProducts.length})</h3>
                    <div className="admin-product-list">
                        {sellerProducts.length === 0 ? (
                            <p className="no-products">You haven't added any products yet.</p>
                        ) : (
                            sellerProducts.map(product => (
                                <div key={product.id} className="admin-product-item">
                                    <img src={product.image} alt={product.name} className="admin-product-thumb" />
                                    <div className="admin-product-info">
                                        <h4>{product.name}</h4>
                                        <p>${product.price.toFixed(2)}</p>
                                    </div>
                                    <div className="product-actions-btns">
                                        <button onClick={() => handleEdit(product)} className="edit-btn">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="delete-btn">Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SellerDashboard;
