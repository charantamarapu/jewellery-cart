/**
 * Fetch live gold and silver prices from goldprice.org API (INR rates)
 * Returns { gold: price, silver: price } in per gram format matching ambicaaspot.com pricing
 * API: https://data-asg.goldprice.org/dbXRates/INR
 * Multipliers applied to match ambicaaspot.com/liverate.html prices
 */
let cachedLiveRates = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

export const fetchLiveRates = async () => {
    try {
        // Return cached rates if still valid
        if (cachedLiveRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
            console.log('📦 Using cached live rates');
            return cachedLiveRates;
        }

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fetch timeout after 8 seconds')), 8000)
        );

        const fetchPromise = fetch('https://data-asg.goldprice.org/dbXRates/INR');

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
            console.error('Failed to fetch live rates:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('📊 API Response:', JSON.stringify(data).substring(0, 200));

        const prices = {
            gold: null,
            silver: null
        };

        // The API response format: { "items": [{"curr":"INR","xauPrice":value,"xagPrice":value}] }
        // Prices are per troy ounce, need to convert to per gram
        // 1 troy ounce = 31.1035 grams
        const TROY_TO_GRAM = 31.1035;
        
        if (data.items && data.items[0]) {
            const item = data.items[0];
            
            if (item.xauPrice) {
                const goldPricePerOz = parseFloat(item.xauPrice);
                let goldPricePerGram = goldPricePerOz / TROY_TO_GRAM; // Convert to per gram
                
                // Apply multiplier to match ambicaaspot.com prices
                const goldMultiplier = (141.48 / 13001.05) * 100; // ≈ 1.099
                goldPricePerGram *= goldMultiplier;
                
                prices.gold = goldPricePerGram;
                console.log(`✅ Gold price found: ₹${goldPricePerOz}/oz = ₹${(goldPricePerOz / TROY_TO_GRAM).toFixed(2)}/g (before multiplier) = ₹${prices.gold.toFixed(2)}/g (after multiplier)`);
            }

            if (item.xagPrice) {
                const silverPricePerOz = parseFloat(item.xagPrice);
                let silverPricePerGram = silverPricePerOz / TROY_TO_GRAM; // Convert to per gram
                
                // Apply multiplier to match ambicaaspot.com prices
                const silverMultiplier = 257.35 / 234.11; // ≈ 1.099
                silverPricePerGram *= silverMultiplier;
                
                prices.silver = silverPricePerGram;
                console.log(`✅ Silver price found: ₹${silverPricePerOz}/oz = ₹${(silverPricePerOz / TROY_TO_GRAM).toFixed(2)}/g (before multiplier) = ₹${prices.silver.toFixed(2)}/g (after multiplier)`);
            }
        }

        // If we found both prices, cache and return them
        if (prices.gold && prices.silver) {
            cachedLiveRates = prices;
            cacheTimestamp = Date.now();
            console.log('✅ Live rates fetched successfully:', prices);
            return prices;
        }

        console.warn('Could not parse all live prices from API. Gold:', prices.gold, 'Silver:', prices.silver);
        return null;
    } catch (err) {
        console.error('Error fetching live rates:', err.message);
        return null;
    }
};

/**
 * Get metal prices - try live rates first, fallback to database
 */
export const getMetalPrices = async (db) => {
    // Try to get live rates first
    const liveRates = await fetchLiveRates();
    
    if (liveRates && liveRates.gold && liveRates.silver) {
        // Use live rates for gold and silver
        const prices = {
            gold: liveRates.gold,
            silver: liveRates.silver
        };

        // Try to get platinum from database
        try {
            const platinum = await db.get('SELECT pricePerGram FROM metal_prices WHERE metal = ?', ['platinum']);
            if (platinum) {
                prices.platinum = platinum.pricePerGram;
            }
        } catch (err) {
            console.warn('Could not fetch platinum price from database:', err.message);
        }

        return prices;
    }

    // Fallback to database prices
    console.log('⚠️ Live rates unavailable, falling back to database metal prices');
    try {
        const allPrices = await db.all('SELECT metal, pricePerGram FROM metal_prices ORDER BY metal');
        const prices = {};
        allPrices.forEach(p => {
            prices[p.metal] = p.pricePerGram;
        });
        return prices;
    } catch (err) {
        console.error('Error fetching prices from database:', err.message);
        return {};
    }
};
