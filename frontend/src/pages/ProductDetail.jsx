import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const { products } = useProducts();
    const { addToCart } = useCart();

    const product = products.find(p => p.id === parseInt(id));

    if (!product) {
        return (
            <section className="product-detail-page">
                <h2>Product not found</h2>
                <Link to="/products">Back to Products</Link>
            </section>
        );
    }

    return (
        <section className="product-detail-page">
            <div className="detail-container">
                <div className="detail-image">
                    <img src={product.image} alt={product.name} />
                </div>
                <div className="detail-info">
                    <h1>{product.name}</h1>
                    <p className="detail-price">₹{product.price.toFixed(2)}</p>
                    <p className="detail-description">{product.description}</p>
                    <button className="add-to-cart-lg" onClick={() => addToCart(product)}>Add to Cart</button>
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;
