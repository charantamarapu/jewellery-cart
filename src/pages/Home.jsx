import React from 'react';
import { useProducts } from '../context/ProductContext';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const { products } = useProducts();
  const featuredProducts = products.slice(0, 4);

  return (
    <section className="home-section">
      <div className="hero">
        <img
          src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1500&q=80"
          alt="Luxury Jewellery"
          className="hero-image"
        />
        <div className="hero-text">
          <h1>Timeless Elegance</h1>
          <p>Handcrafted jewellery for your most precious moments.</p>
        </div>
      </div>
      <div className="featured-products">
        <h2>Featured Products</h2>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <img src={product.image} alt={product.name} className="product-image" />
              <h3>{product.name}</h3>
              <p className="price">${product.price.toFixed(2)}</p>
              <Link to={`/product/${product.id}`} className="view-details-btn">View Details</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Home;
