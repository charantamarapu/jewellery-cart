import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Back to top
            </div>
            <div className="footer-content">
                <div className="footer-section">
                    <h3>Get to Know Us</h3>
                    <ul>
                        <li>Careers</li>
                        <li>Blog</li>
                        <li>About Jewellery-Cart</li>
                        <li>Investor Relations</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Make Money with Us</h3>
                    <ul>
                        <li>Sell products on Jewellery-Cart</li>
                        <li>Become a Partner</li>
                        <li>Advertise Your Products</li>
                        <li>Become an Affiliate</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Payment Options</h3>
                    <ul>
                        <li>Credit & Debit Cards</li>
                        <li>Shop with Points</li>
                        <li>Gift Cards</li>
                        <li>Secure Checkout</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Let Us Help You</h3>
                    <ul>
                        <li>Customer Service</li>
                        <li>Your Account</li>
                        <li>Your Orders</li>
                        <li>Shipping & Returns</li>
                    </ul>
                </div>
            </div>
            <div className="footer-logo">
                <div className="logo-inner">Jewellery-Cart</div>
            </div>
            <div className="footer-bottom">
                <p>© 2026, Jewellery-Cart, Inc. or its affiliates</p>
            </div>
        </footer>
    );
};

export default Footer;
