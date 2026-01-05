import React from 'react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import './ProductList.css';

const ProductList = () => {
    const { products } = useProducts();
    const { addToCart } = useCart();

    return (
        <section className="product-list-page">
            <h2>All Products</h2>
            <div className="product-grid">
                {products.map((product) => (
                    <div key={product.id} className="product-card">
                        <img src={product.image} alt={product.name} className="product-image" />
                        <h3>{product.name}</h3>
                        <p className="description">{product.description}</p>
                        <p className="price">₹{product.price.toFixed(2)}</p>
                        <div className="product-actions">
                            <Link to={`/product/${product.id}`} className="view-details-btn">View Details</Link>
                            <button
                                className="add-to-cart-btn"
                                onClick={() => addToCart(product)}
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductList;
