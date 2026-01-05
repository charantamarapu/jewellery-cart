import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { products, addProduct, deleteProduct } = useProducts();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        image: ''
    });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return;
        
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });
        
        const result = await addProduct({
            ...formData,
            price: parseFloat(formData.price),
            image: formData.image || 'https://via.placeholder.com/150'
        });
        
        if (result.success) {
            setFormData({ name: '', price: '', description: '', image: '' });
            setMessage({ type: 'success', text: 'Product added successfully!' });
        } else {
            setMessage({ type: 'error', text: result.message || 'Failed to add product' });
        }
        setIsSubmitting(false);
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        
        const result = await deleteProduct(id);
        if (result.success) {
            setMessage({ type: 'success', text: 'Product deleted successfully!' });
        } else {
            setMessage({ type: 'error', text: result.message || 'Failed to delete product' });
        }
    };

    return (
        <section className="admin-page">
            <h2>Admin Dashboard</h2>
            <p className="welcome-text">Welcome, Admin! Manage all products here.</p>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="admin-content">
                <div className="add-product-section">
                    <h3>Add New Product</h3>
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
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Product'}
                        </button>
                    </form>
                </div>

                <div className="product-list-section">
                    <h3>Existing Products ({products.length})</h3>
                    <div className="admin-product-list">
                        {products.map(product => (
                            <div key={product.id} className="admin-product-item">
                                <img src={product.image} alt={product.name} className="admin-product-thumb" />
                                <div className="admin-product-info">
                                    <h4>{product.name}</h4>
                                    <p>${product.price.toFixed(2)}</p>
                                    {product.sellerId && <span className="seller-badge">Seller Product</span>}
                                </div>
                                <button onClick={() => handleDeleteProduct(product.id)} className="delete-btn">Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AdminDashboard;
