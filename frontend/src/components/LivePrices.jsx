import React, { useState, useEffect } from 'react';
import './LivePrices.css';

const LivePrices = ({ showPlatinum = false }) => {
    const [prices, setPrices] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrices();
        // Refresh every 5 minutes (cache duration)
        const interval = setInterval(fetchPrices, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchPrices = async () => {
        try {
            const response = await fetch('/api/inventory/metals/prices');
            const data = await response.json();
            if (data.success) {
                setPrices(data.prices);
            }
        } catch (err) {
            console.error('Error fetching live prices:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !prices) {
        return null;
    }

    return (
        <div className="live-prices-widget">
            <div className="live-prices-header">
                <span className="live-indicator">🔴 LIVE</span>
                <h4>Metal Prices</h4>
                {prices.gold && (
                    <span className="price-item gold">
                        Gold: ₹{prices.gold.toFixed(2)}/g
                    </span>
                )}
                {prices.silver && (
                    <span className="price-item silver">
                        Silver: ₹{prices.silver.toFixed(2)}/g
                    </span>
                )}
                {showPlatinum && prices.platinum && (
                    <span className="price-item platinum">
                        Platinum: ₹{prices.platinum.toFixed(2)}/g
                    </span>
                )}
            </div>
        </div>
    );
};

export default LivePrices;
