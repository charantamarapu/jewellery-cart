import { getImageUrl } from './imageProxy.js';

// Utility function to get image source from product data
export const getProductImageSrc = (product) => {
    if (!product) return 'https://via.placeholder.com/150';

    // Check imageUrl first (preferred when Google Drive URLs are involved)
    if (product.imageUrl && typeof product.imageUrl === 'string') {
        // Use proxy for Google Drive URLs
        if (product.imageUrl.includes('drive.google.com')) {
            return getImageUrl(product.imageUrl);
        }
        // Use direct URL for other sources
        if (product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:')) {
            return product.imageUrl;
        }
    }

    // Check product.image field
    if (product.image && typeof product.image === 'string') {
        // Use proxy for Google Drive URLs
        if (product.image.includes('drive.google.com')) {
            return getImageUrl(product.image);
        }
        // Use direct URL for other sources
        if (product.image.startsWith('http') || product.image.startsWith('data:')) {
            return product.image;
        }
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/150';
};
