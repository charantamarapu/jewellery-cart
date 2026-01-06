import React, { createContext, useState, useContext, useEffect } from 'react';
import { useProducts } from './ProductContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const { products } = useProducts();
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    // Helper to get current stock for a product
    const getProductStock = (productId) => {
        const product = products.find(p => p.id === productId);
        return product ? (product.stock ?? Infinity) : Infinity;
    };

    const addToCart = (product) => {
        const stock = product.stock ?? Infinity;
        let result = { success: true };

        setCart(currentCart => {
            const existing = currentCart.find(item => item.id === product.id);
            const currentQty = existing ? existing.quantity : 0;

            if (currentQty + 1 > stock) {
                result = { success: false, reason: 'STOCK_LIMIT', available: stock };
                return currentCart;
            }

            if (existing) {
                return currentCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1, stock } : item
                );
            }
            return [...currentCart, { ...product, quantity: 1, stock }];
        });

        return result;
    };

    const removeFromCart = (id) => {
        setCart(currentCart => currentCart.filter(item => item.id !== id));
    };

    const updateQuantity = (id, quantity, maxStock) => {
        if (quantity < 1) {
            removeFromCart(id);
            return { success: true };
        }

        const stock = maxStock ?? getProductStock(id);
        if (quantity > stock) {
            return { success: false, reason: 'STOCK_LIMIT', available: stock };
        }

        setCart(currentCart => currentCart.map(item => item.id === id ? { ...item, quantity } : item));
        return { success: true };
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, getProductStock }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
