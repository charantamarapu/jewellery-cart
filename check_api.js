
const API_URL = 'http://localhost:5000/api/products';

async function checkApi() {
    try {
        console.log('Fetching products...');
        const res = await fetch(API_URL);
        const data = await res.json();

        console.log('Products found:', data.products?.length);

        if (data.products && data.products.length > 0) {
            const p = data.products[0];
            console.log('Product 1:');
            console.log('  ID:', p.id);
            console.log('  Name:', p.name);
            console.log('  Image (type):', typeof p.image);
            console.log('  Image (content length):', p.image ? p.image.length : 0);
            console.log('  ImageUrl:', p.imageUrl);
            console.log('  Price:', p.price);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkApi();
