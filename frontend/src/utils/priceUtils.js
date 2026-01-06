// Utility to fetch and calculate product price from inventory
export const calculateProductPrice = async (productId) => {
    try {
        const response = await fetch(`/api/inventory/product/${productId}`);
        const data = await response.json();
        
        if (data.item && data.item.totalPrice) {
            return data.item.totalPrice;
        }
        return 0;
    } catch (error) {
        console.error('Error fetching inventory for price:', error);
        return 0;
    }
};

// Batch fetch prices for multiple products
export const calculateProductPrices = async (productIds) => {
    try {
        const priceMap = {};
        
        // Fetch inventory for all products in parallel
        const promises = productIds.map(id =>
            fetch(`/api/inventory/product/${id}`)
                .then(res => res.json())
                .then(data => {
                    priceMap[id] = data.item?.totalPrice || 0;
                })
                .catch(() => {
                    priceMap[id] = 0;
                })
        );
        
        await Promise.all(promises);
        return priceMap;
    } catch (error) {
        console.error('Error fetching inventory prices:', error);
        return {};
    }
};
