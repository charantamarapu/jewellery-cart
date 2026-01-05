import { useState } from 'react';
import './ProductFilters.css';

export default function ProductFilters({ filters, onFiltersChange }) {
    const [priceMin, setPriceMin] = useState(filters.minPrice || '');
    const [priceMax, setPriceMax] = useState(filters.maxPrice || '');

    const handleSortChange = (e) => {
        const value = e.target.value;
        const [sort, order] = value.split('_');
        onFiltersChange({ ...filters, sort, order });
    };

    const handlePriceFilter = () => {
        onFiltersChange({
            ...filters,
            minPrice: priceMin ? parseFloat(priceMin) : undefined,
            maxPrice: priceMax ? parseFloat(priceMax) : undefined
        });
    };

    const clearPriceFilter = () => {
        setPriceMin('');
        setPriceMax('');
        onFiltersChange({
            ...filters,
            minPrice: undefined,
            maxPrice: undefined
        });
    };

    const getCurrentSortValue = () => {
        if (!filters.sort) return 'createdAt_DESC';
        return `${filters.sort}_${filters.order || 'DESC'}`;
    };

    return (
        <div className="product-filters">
            <div className="filter-group">
                <label htmlFor="sort">Sort By:</label>
                <select
                    id="sort"
                    value={getCurrentSortValue()}
                    onChange={handleSortChange}
                    className="filter-select"
                >
                    <option value="createdAt_DESC">Newest First</option>
                    <option value="price_ASC">Price: Low to High</option>
                    <option value="price_DESC">Price: High to Low</option>
                    <option value="name_ASC">Name: A to Z</option>
                    <option value="name_DESC">Name: Z to A</option>
                </select>
            </div>

            <div className="filter-group price-filter">
                <label>Price Range:</label>
                <div className="price-inputs">
                    <input
                        type="number"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="price-input"
                        min="0"
                    />
                    <span className="price-separator">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="price-input"
                        min="0"
                    />
                    <button onClick={handlePriceFilter} className="apply-btn">
                        Apply
                    </button>
                    {(priceMin || priceMax) && (
                        <button onClick={clearPriceFilter} className="clear-btn">
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
