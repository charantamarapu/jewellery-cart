import { useState, useEffect } from 'react';
import './CategoryFilter.css';

export default function CategoryFilter({ selectedCategory, onCategoryChange }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="category-filter">
                <h3>Categories</h3>
                <div className="category-skeleton">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton-item"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="category-filter">
            <h3>Categories</h3>
            <div className="category-list">
                <button
                    className={`category-item ${!selectedCategory ? 'active' : ''}`}
                    onClick={() => onCategoryChange(null)}
                >
                    <span className="category-name">All Products</span>
                </button>
                {categories.map(category => (
                    <button
                        key={category.id}
                        className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                        onClick={() => onCategoryChange(category.id)}
                    >
                        <span className="category-name">{category.name}</span>
                        <span className="product-count">{category.productCount || 0}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
