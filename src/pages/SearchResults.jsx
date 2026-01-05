import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import './ProductList.css'; // Reuse product list styles
import './SearchResults.css';

const SearchResults = () => {
    const { search } = useLocation();
    const query = new URLSearchParams(search).get('q');
    const { products } = useProducts();
    const { addToCart } = useCart();

    const filteredProducts = useMemo(() => {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return products.filter(product =>
            product.name.toLowerCase().includes(lowerQuery) ||
            product.description.toLowerCase().includes(lowerQuery)
        );
    }, [query, products]);

    return (
        <section className="product-list-page search-results-page">
            <h2>Search Results for "{query}"</h2>
            {filteredProducts.length === 0 ? (
                <p>No products found matching your search. Try different keywords.</p>
            ) : (
                <div className="product-grid">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="product-card">
                            <img src={product.image} alt={product.name} className="product-image" />
                            <h3>{product.name}</h3>
                            <p className="description">{product.description}</p>
                            <p className="price">${product.price.toFixed(2)}</p>
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
            )}
        </section>
    );
};

export default SearchResults;
