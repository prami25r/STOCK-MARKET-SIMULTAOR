const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// --- MOCK STOCK API ---
// In a real app, you would use an external API like Finnhub or Alpha Vantage here.
// To keep this self-contained and free, we'll simulate the API responses.

const mockStockData = {
    'AAPL': { name: 'Apple Inc.', sector: 'Technology', price: 175.50 },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', price: 140.20 },
    'MSFT': { name: 'Microsoft Corp.', sector: 'Technology', price: 340.75 },
    'AMZN': { name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical', price: 135.10 },
    'TSLA': { name: 'Tesla, Inc.', sector: 'Consumer Cyclical', price: 250.80 },
    'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financial Services', price: 155.45 },
    'V': { name: 'Visa Inc.', sector: 'Financial Services', price: 240.90 },
    'SPY': { name: 'SPDR S&P 500 ETF', sector: 'ETF', price: 450.30 },
    'QQQ': { name: 'Invesco QQQ Trust', sector: 'ETF', price: 380.60 },
};

// Generates a random-walk price history
const generatePriceHistory = (startPrice, days) => {
    const history = [];
    let currentPrice = startPrice;
    for (let i = 0; i < days; i++) {
        const changePercent = (Math.random() - 0.49) * 0.03; // Random change between -1.5% and +1.5%
        currentPrice *= (1 + changePercent);
        history.push({
            date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: parseFloat(currentPrice.toFixed(2)),
        });
    }
    return history;
};

// --- Get Quote for a specific stock ---
router.get('/quote/:symbol', authMiddleware, (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const stock = mockStockData[symbol];

    if (!stock) {
        return res.status(404).json({ msg: 'Stock symbol not found' });
    }

    // Simulate small price fluctuations
    const livePrice = parseFloat((stock.price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));

    res.json({
        symbol,
        name: stock.name,
        price: livePrice,
        sector: stock.sector,
    });
});

// --- Get Chart Data ---
router.get('/history/:symbol', authMiddleware, (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const stock = mockStockData[symbol];

    if (!stock) {
        return res.status(404).json({ msg: 'Stock symbol not found' });
    }

    res.json({
        '1w': generatePriceHistory(stock.price, 7),
        '1m': generatePriceHistory(stock.price, 30),
    });
});

// --- Mock News Feed ---
const mockNews = [
    { source: 'MarketWatch', headline: 'Tech Stocks Rally on Positive Inflation Report', url: '#' },
    { source: 'Reuters', headline: 'Federal Reserve Hints at Pausing Interest Rate Hikes', url: '#' },
    { source: 'Bloomberg', headline: 'Oil Prices Dip as Supply Concerns Ease', url: '#' },
    { source: 'The Wall Street Journal', headline: 'Tesla Unveils New Battery Technology, Stock Jumps 5%', url: '#' },
    { source: 'Financial Times', headline: 'Analysts Bullish on Financial Sector for Q4', url: '#' },
];

router.get('/news', authMiddleware, (req, res) => {
    res.json(mockNews);
});


module.exports = router;
