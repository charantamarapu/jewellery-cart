import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState([]);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addProduct = async (product) => {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product),
            });
            if (response.ok) {
                fetchProducts();
            }
        } catch (error) {
            console.error('Failed to add product:', error);
        }
    };

    const updateProduct = (id, updatedProduct) => {
        // Implement update logic if needed
    };

    const deleteProduct = async (id) => {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchProducts();
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    return (
        <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => useContext(ProductContext);
