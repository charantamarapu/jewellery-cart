import React, { useState, useEffect, useCallback } from 'react';
import './SearchInput.css';

const SearchInput = ({
    placeholder = 'Search...',
    onSearch,
    debounceMs = 300,
    value: externalValue,
    className = ''
}) => {
    const [inputValue, setInputValue] = useState(externalValue || '');

    // Sync with external value if provided
    useEffect(() => {
        if (externalValue !== undefined) {
            setInputValue(externalValue);
        }
    }, [externalValue]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch) {
                onSearch(inputValue);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [inputValue, debounceMs, onSearch]);

    const handleClear = () => {
        setInputValue('');
        if (onSearch) {
            onSearch('');
        }
    };

    return (
        <div className={`search-input-container ${className}`}>
            <span className="search-icon">🔍</span>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="search-input"
            />
            {inputValue && (
                <button
                    type="button"
                    className="clear-btn"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default SearchInput;
