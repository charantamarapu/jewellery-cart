import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const { products } = useProducts();
    const { addToCart, cart } = useCart();
    const toast = useToast();

    const [product, setProduct] = useState(null);
    const [inventory, setInventory] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [selectedImage, setSelectedImage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    // First try to find product from context, then fetch directly
    useEffect(() => {
        const productId = parseInt(id);
        const contextProduct = products.find(p => p.id === productId);

        if (contextProduct) {
            setProduct(contextProduct);
            setLoading(false);
        } else {
            // Fetch product directly from API
            fetch(`/api/products/${productId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Product not found');
                    return res.json();
                })
                .then(data => {
                    setProduct(data);
                    setLoading(false);
                })
                .catch(() => {
                    setProduct(null);
                    setLoading(false);
                });
        }
    }, [id, products]);

    // Fetch jewelry inventory/specifications
    useEffect(() => {
        if (product) {
            fetch(`/api/inventory/product/${product.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.item) {
                        setInventory(data.item);
                    }
                })
                .catch(err => console.error('Error fetching inventory:', err));
        }
    }, [product]);

    // Fetch reviews
    useEffect(() => {
        if (product) {
            fetch(`/api/reviews/product/${product.id}`)
                .then(res => res.json())
                .then(data => {
                    setReviews(Array.isArray(data) ? data : []);
                    setReviewsLoading(false);
                })
                .catch(() => setReviewsLoading(false));
        }
    }, [product]);

    const cartItem = cart.find(item => item.id === parseInt(id));
    const currentQtyInCart = cartItem ? cartItem.quantity : 0;

    // Parse images array
    const images = product ? (() => {
        try {
            const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : [product.image];
        } catch {
            return [product.image];
        }
    })() : [];

    const handleAddToCart = () => {
        const result = addToCart(product);
        if (!result.success && result.reason === 'STOCK_LIMIT') {
            toast.warning(`Sorry, only ${result.available} items available in stock.`);
        } else if (result.success) {
            toast.success(`${product.name} added to cart!`);
        }
    };

    // Stock status
    const getStockStatus = () => {
        const stock = product?.stock ?? 0;
        if (stock === 0) return { label: 'Out of Stock', className: 'stock-out' };
        if (stock <= 5) return { label: `Hurry! Only ${stock} left`, className: 'stock-low' };
        return { label: 'In Stock', className: 'stock-in' };
    };

    // Average rating
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    // Helper to format metal name
    const formatMetal = (metal) => {
        if (!metal) return 'N/A';
        return metal.charAt(0).toUpperCase() + metal.slice(1);
    };

    // Helper to format ornament name
    const formatOrnament = (ornament, customOrnament) => {
        if (ornament === 'custom' && customOrnament) return customOrnament;
        if (!ornament) return 'N/A';
        const names = {
            'earring': 'Earring',
            'ring': 'Finger Ring',
            'necklace': 'Necklace',
            'bracelet': 'Bracelet',
            'anklet': 'Anklet',
            'pendant': 'Pendant',
            'chain': 'Chain',
            'bangle': 'Bangle'
        };
        return names[ornament] || ornament;
    };

    // Loading state
    if (loading) {
        return (
            <section className="product-detail-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading product details...</p>
                </div>
            </section>
        );
    }

    if (!product) {
        return (
            <section className="product-detail-page">
                <h2>Product not found</h2>
                <Link to="/products">Back to Products</Link>
            </section>
        );
    }

    const stockStatus = getStockStatus();
    const isOutOfStock = product.stock === 0;
    const isAtLimit = currentQtyInCart >= product.stock;

    return (
        <section className="product-detail-page">
            <div className="detail-container">
                <div className="detail-image-section">
                    <div className="detail-image">
                        <img src={images[selectedImage]} alt={product.name} />
                    </div>
                    {images.length > 1 && (
                        <div className="image-thumbnails">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`thumbnail ${selectedImage === idx ? 'active' : ''}`}
                                    onClick={() => setSelectedImage(idx)}
                                >
                                    <img src={img} alt={`${product.name} ${idx + 1}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="detail-info">
                    <h1>{product.name}</h1>
                    <p className="detail-price">₹{product.price.toFixed(2)}</p>

                    <span className={`stock-badge ${stockStatus.className}`}>
                        {stockStatus.label}
                    </span>

                    {avgRating && (
                        <div className="rating-summary">
                            <span className="stars">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
                            <span className="rating-value">{avgRating}</span>
                            <span className="review-count">({reviews.length} reviews)</span>
                        </div>
                    )}

                    <p className="detail-description">{product.description || 'No description available.'}</p>

                    <button
                        className={`add-to-cart-lg ${isOutOfStock || isAtLimit ? 'disabled' : ''}`}
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || isAtLimit}
                    >
                        {isOutOfStock ? 'Out of Stock' : isAtLimit ? 'Max Quantity in Cart' : 'Add to Cart'}
                    </button>
                    {currentQtyInCart > 0 && (
                        <p className="cart-qty-info">{currentQtyInCart} already in your cart</p>
                    )}
                </div>
            </div>

            {/* Jewelry Specifications Section */}
            {inventory && (
                <div className="specifications-section">
                    <h2>💎 Jewelry Specifications</h2>
                    {inventory.image && (
                        <div className="spec-image-container">
                            <img src={inventory.image} alt="Certificate/Specification" className="spec-image" />
                        </div>
                    )}
                    <div className="specs-grid">
                        <div className="spec-group">
                            <h3>Material Details</h3>
                            <div className="spec-item">
                                <span className="spec-label">Metal</span>
                                <span className="spec-value">{formatMetal(inventory.metal)}</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Purity</span>
                                <span className="spec-value">
                                    {inventory.purity}%
                                    {inventory.hallmarked ? <span className="hallmark-badge">✓ Hallmarked</span> : ''}
                                </span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Type</span>
                                <span className="spec-value">{inventory.type || 'Normal'}</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Ornament</span>
                                <span className="spec-value">{formatOrnament(inventory.ornament, inventory.customOrnament)}</span>
                            </div>
                        </div>

                        <div className="spec-group">
                            <h3>Weight Details</h3>
                            <div className="spec-item">
                                <span className="spec-label">Net Weight</span>
                                <span className="spec-value">{inventory.netWeight} grams</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Gross Weight</span>
                                <span className="spec-value">{inventory.grossWeight} grams</span>
                            </div>
                            {inventory.extraWeight > 0 && (
                                <>
                                    <div className="spec-item">
                                        <span className="spec-label">Extra (Stones/Pearls)</span>
                                        <span className="spec-value">{inventory.extraDescription || 'N/A'}</span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Extra Weight</span>
                                        <span className="spec-value">{inventory.extraWeight} grams</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="spec-group">
                            <h3>Price Breakdown</h3>
                            <div className="spec-item">
                                <span className="spec-label">Metal Price</span>
                                <span className="spec-value">₹{inventory.metalPrice}/gram</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Wastage</span>
                                <span className="spec-value">{inventory.wastagePercent}%</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Making Charge</span>
                                <span className="spec-value">₹{inventory.makingChargePerGram}/gram</span>
                            </div>
                            {inventory.extraValue > 0 && (
                                <div className="spec-item">
                                    <span className="spec-label">Extra Value</span>
                                    <span className="spec-value">₹{inventory.extraValue}</span>
                                </div>
                            )}
                            <div className="spec-item total">
                                <span className="spec-label">Total Price</span>
                                <span className="spec-value">₹{inventory.totalPrice?.toFixed(2) || product.price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <div className="reviews-section">
                <h2>Customer Reviews</h2>
                {reviewsLoading ? (
                    <p>Loading reviews...</p>
                ) : reviews.length === 0 ? (
                    <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
                ) : (
                    <div className="reviews-list">
                        {reviews.map((review) => (
                            <div key={review.id} className="review-card">
                                <div className="review-header">
                                    <span className="review-author">{review.userName || 'Anonymous'}</span>
                                    <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                </div>
                                <p className="review-comment">{review.comment}</p>
                                <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProductDetail;
