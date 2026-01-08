import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { getProductImageSrc } from '../utils/imageUtils';
import { calculateProductPrices } from '../utils/priceUtils';
import CategoryFilter from '../components/CategoryFilter';
import ProductFilters from '../components/ProductFilters';
import Pagination from '../components/Pagination';
import './ProductList.css';

const ProductList = () => {
    const { addToCart } = useCart();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState({
        category: null,
        minPrice: undefined,
        maxPrice: undefined,
        sort: 'createdAt',
        order: 'DESC',
        page: 1,
        limit: 12
    });

    useEffect(() => {
        fetchProducts();
    }, [filters]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.minPrice) params.append('minPrice', filters.minPrice);
            if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
            if (filters.sort) params.append('sort', filters.sort);
            if (filters.order) params.append('order', filters.order);
            params.append('page', filters.page);
            params.append('limit', filters.limit);

            const response = await fetch(`/api/products?${params}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || []);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = (categoryId) => {
        setFilters({ ...filters, category: categoryId, page: 1 });
    };

    const handleFiltersChange = (newFilters) => {
        setFilters({ ...newFilters, page: 1 });
    };

    const handlePageChange = (page) => {
        setFilters({ ...filters, page });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getStockBadge = (stock) => {
        if (stock === 0) return <span className="stock-badge out-of-stock">Out of Stock</span>;
        if (stock < 5) return <span className="stock-badge low-stock">Low Stock</span>;
        return <span className="stock-badge in-stock">In Stock</span>;
    };

    return (
        <section className="product-list-page">
            <div className="product-list-header">
                <h2>All Products</h2>
                <p className="results-count">
                    {pagination.total} {pagination.total === 1 ? 'Product' : 'Products'} Found
                </p>
            </div>

            <div className="product-list-container">
                <aside className="filters-sidebar">
                    <CategoryFilter
                        selectedCategory={filters.category}
                        onCategoryChange={handleCategoryChange}
                    />
                </aside>

                <div className="products-main">
                    <ProductFilters
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                    />

                    {loading ? (
                        <div className="products-loading">
                            <div className="product-grid">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="product-card-skeleton">
                                        <div className="skeleton-image"></div>
                                        <div className="skeleton-text"></div>
                                        <div className="skeleton-text short"></div>
                                        <div className="skeleton-text"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="no-products">
                            <p>No products found matching your criteria.</p>
                            <button
                                onClick={() => setFilters({
                                    category: null,
                                    minPrice: undefined,
                                    maxPrice: undefined,
                                    sort: 'createdAt',
                                    order: 'DESC',
                                    page: 1,
                                    limit: 12
                                })}
                                className="reset-filters-btn"
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="product-grid">
                                {products.map((product) => (
                                    <div key={product.id} className="product-card">
                                        <span className="product-id-badge">#{product.id}</span>
                                        {product.categoryName && (
                                            <span className="category-badge">{product.categoryName}</span>
                                        )}
                                        <img src={getProductImageSrc(product)} alt={product.name} className="product-image" />
                                        <div className="product-info">
                                            <h3>{product.name}</h3>
                                            {product.sellerName && (
                                                <p className="seller-name">by {product.sellerName}</p>
                                            )}
                                            {product.avgRating > 0 && (
                                                <div className="rating">
                                                    <span className="stars">{'⭐'.repeat(Math.round(product.avgRating))}</span>
                                                    <span className="rating-count">({product.reviewCount})</span>
                                                </div>
                                            )}
                                            <p className="description">{product.description}</p>
                                            <div className="product-footer">
                                                <p className="price">₹{(product.price || 0).toFixed(2)}</p>
                                                {getStockBadge(product.stock)}
                                            </div>
                                            <div className="product-actions">
                                                <Link to={`/product/${product.id}`} className="view-details-btn">
                                                    View Details
                                                </Link>
                                                <button
                                                    className="add-to-cart-btn"
                                                    onClick={() => addToCart(product)}
                                                    disabled={product.stock === 0}
                                                >
                                                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                            />
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ProductList;
