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
                        <li>About Amazon</li>
                        <li>Investor Relations</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Make Money with Us</h3>
                    <ul>
                        <li>Sell products on Amazon</li>
                        <li>Sell on Amazon Business</li>
                        <li>Sell apps on Amazon</li>
                        <li>Become an Affiliate</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Amazon Payment Products</h3>
                    <ul>
                        <li>Amazon Business Card</li>
                        <li>Shop with Points</li>
                        <li>Reload Your Balance</li>
                        <li>Amazon Currency Converter</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Let Us Help You</h3>
                    <ul>
                        <li>Amazon and COVID-19</li>
                        <li>Your Account</li>
                        <li>Your Orders</li>
                        <li>Shipping Rates & Policies</li>
                    </ul>
                </div>
            </div>
            <div className="footer-logo">
                <div className="logo-inner">Luxe Gems</div>
            </div>
            <div className="footer-bottom">
                <p>© 2026, Luxe Gems, Inc. or its affiliates</p>
            </div>
        </footer>
    );
};

export default Footer;
