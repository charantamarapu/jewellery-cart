import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState([]);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            // Handle both paginated response and direct array
            const productArray = data.products || data;
            setProducts(Array.isArray(productArray) ? productArray : []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addProduct = async (product) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(product),
            });
            if (response.ok) {
                const newProduct = await response.json();
                fetchProducts();
                return { success: true, productId: newProduct.id };
            } else {
                const data = await response.json();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Failed to add product:', error);
            return { success: false, message: 'Failed to add product' };
        }
    };

    const updateProduct = async (id, updatedProduct) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProduct),
            });
            if (response.ok) {
                fetchProducts();
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Failed to update product:', error);
            return { success: false, message: 'Failed to update product' };
        }
    };

    const deleteProduct = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchProducts();
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            return { success: false, message: 'Failed to delete product' };
        }
    };

    const fetchSellerProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/products/seller/my-products', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to fetch seller products:', error);
            return [];
        }
    };

    return (
        <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, fetchSellerProducts, fetchProducts }}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => useContext(ProductContext);
