// Utility function to get image source from product data
export const getProductImageSrc = (product) => {
    if (!product) return 'https://via.placeholder.com/150';

    // If product has imageUrl and it's a valid URL, use it
    if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.startsWith('http')) {
        return product.imageUrl;
    }

    // If product.image is a URL (direct image URL from form)
    if (product.image && typeof product.image === 'string' && product.image.startsWith('http')) {
        return product.image;
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/150';
};
