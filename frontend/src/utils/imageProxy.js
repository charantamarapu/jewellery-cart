/**
 * Image proxy utility for handling CORS-blocked images
 * Proxies Google Drive images through the backend API
 */

export const getImageUrl = (url) => {
    if (!url) return null;
    
    // If it's a Google Drive URL, proxy it through our backend
    if (url.includes('drive.google.com')) {
        // Extract the direct Google Drive URL
        let driveUrl = url;
        
        // If it's not already a direct view URL, convert it
        if (!url.includes('drive.google.com/uc?export=view')) {
            const match1 = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match1 && match1[1]) {
                driveUrl = `https://drive.google.com/uc?export=view&id=${match1[1]}`;
            }
        }
        
        // Return proxied URL
        return `/api/upload/proxy-image?url=${encodeURIComponent(driveUrl)}`;
    }
    
    // For other URLs, return as-is
    return url;
};

export default getImageUrl;
