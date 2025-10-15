import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// --- Chart.js Registration ---
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- MOCK API (Self-Contained for Preview) ---
const api = {
    _db: {
        users: JSON.parse(localStorage.getItem('db_users')) || [],
        holdings: JSON.parse(localStorage.getItem('db_holdings')) || [],
        transactions: JSON.parse(localStorage.getItem('db_transactions')) || [],
    },
    _saveDb() {
        localStorage.setItem('db_users', JSON.stringify(this._db.users));
        localStorage.setItem('db_holdings', JSON.stringify(this._db.holdings));
        localStorage.setItem('db_transactions', JSON.stringify(this._db.transactions));
    },
    _getCurrentUserId() {
        const token = localStorage.getItem('token');
        return token;
    },
    async signup(username, email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this._db.users.find(u => u.email === email)) {
                    return reject(new Error('User already exists'));
                }
                const newUser = { id: email, username, email, password, cash: 1000000, verified: false };
                this._db.users.push(newUser);
                this._saveDb();
                resolve({ token: email });
            }, 500);
        });
    },
    async login(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = this._db.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    return reject(new Error('Invalid Credentials'));
                }
                if (!user.verified) {
                    return reject(new Error('Please verify your email before logging in.'));
                }
                resolve({ token: user.email });
            }, 500);
        });
    },
    async verifyEmail(email) {
        return new Promise((resolve, reject) => {
             setTimeout(() => {
                const user = this._db.users.find(u => u.email === email);
                if (user) {
                    user.verified = true;
                    this._saveDb();
                    resolve({ msg: 'Email verified successfully!' });
                } else {
                    reject(new Error('User not found.'));
                }
            }, 500);
        });
    },
    async getPortfolio() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const userId = this._getCurrentUserId();
                const user = this._db.users.find(u => u.id === userId);
                if (!user) {
                    return reject(new Error("User not found"));
                }
                const holdings = this._db.holdings.filter(h => h.userId === userId);
                const transactions = this._db.transactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve({ user: { id: user.id, username: user.username, email: user.email, cash: user.cash }, holdings, transactions });
            }, 500);
        });
    },
    async buyStock(symbol, quantity, price) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const userId = this._getCurrentUserId();
                const user = this._db.users.find(u => u.id === userId);
                const totalCost = quantity * price;

                if (user.cash < totalCost) {
                    return reject(new Error('Insufficient funds'));
                }
                user.cash -= totalCost;

                let holding = this._db.holdings.find(h => h.userId === userId && h.symbol === symbol);
                if (holding) {
                    const newTotalQuantity = holding.quantity + quantity;
                    holding.avgPrice = ((holding.avgPrice * holding.quantity) + totalCost) / newTotalQuantity;
                    holding.quantity = newTotalQuantity;
                } else {
                    this._db.holdings.push({ userId, symbol, quantity, avgPrice: price });
                }

                this._db.transactions.push({ userId, type: 'BUY', symbol, quantity, price, date: new Date().toISOString() });
                this._saveDb();
                resolve({ msg: 'Stock purchased' });
            }, 500);
        });
    },
    async sellStock(symbol, quantity, price) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                 const userId = this._getCurrentUserId();
                const user = this._db.users.find(u => u.id === userId);
                let holding = this._db.holdings.find(h => h.userId === userId && h.symbol === symbol);

                if (!holding || holding.quantity < quantity) {
                    return reject(new Error('Insufficient stock holdings'));
                }
                
                user.cash += quantity * price;
                holding.quantity -= quantity;

                if (holding.quantity === 0) {
                    this._db.holdings = this._db.holdings.filter(h => !(h.userId === userId && h.symbol === symbol));
                }
                
                this._db.transactions.push({ userId, type: 'SELL', symbol, quantity, price, date: new Date().toISOString() });
                this._saveDb();
                resolve({ msg: 'Stock sold' });
            }, 500);
        });
    },
    _mockStockData: {
        'AAPL': { name: 'Apple Inc.', sector: 'Technology', price: 175.50 },
        'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', price: 140.20 },
        'MSFT': { name: 'Microsoft Corp.', sector: 'Technology', price: 340.75 },
        'AMZN': { name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical', price: 135.10 },
        'TSLA': { name: 'Tesla, Inc.', sector: 'Consumer Cyclical', price: 250.80 },
        'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financial Services', price: 155.45 },
        'V': { name: 'Visa Inc.', sector: 'Financial Services', price: 240.90 },
        'SPY': { name: 'SPDR S&P 500 ETF', sector: 'ETF', price: 450.30 },
        'QQQ': { name: 'Invesco QQQ Trust', sector: 'ETF', price: 380.60 },
    },
    _generatePriceHistory(startPrice, days) {
        const history = [];
        let currentPrice = startPrice;
        for (let i = 0; i < days; i++) {
            const changePercent = (Math.random() - 0.49) * 0.03;
            currentPrice *= (1 + changePercent);
            history.push({
                date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                price: parseFloat(currentPrice.toFixed(2)),
            });
        }
        return history;
    },
    async getStockQuote(symbol) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const stock = this._mockStockData[symbol.toUpperCase()];
                if (!stock) return reject(new Error('Stock symbol not found'));
                const livePrice = parseFloat((stock.price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));
                resolve({ symbol, name: stock.name, price: livePrice, sector: stock.sector });
            }, 300);
        });
    },
    async getStockHistory(symbol) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const stock = this._mockStockData[symbol.toUpperCase()];
                if (!stock) return reject(new Error('Stock symbol not found'));
                resolve({
                    '1w': this._generatePriceHistory(stock.price, 7),
                    '1m': this._generatePriceHistory(stock.price, 30),
                });
            }, 400);
        });
    },
    async getNews() {
         return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { source: 'Moneycontrol', headline: 'Google to invest $1.5 billion in AI hub at Visakhapatnam', url: 'https://www.moneycontrol.com/artificial-intelligence/google-to-invest-15-billion-in-ai-hub-at-visakhapatnam-its-largest-india-bet-yet-article-13615802.html' },
                    { source: 'Moneycontrol', headline: 'GST 2.0 drives festive car sales, but food and medicine price cuts remain elusive', url: 'https://www.moneycontrol.com/news/business/economy/gst-2-0-drives-festive-car-sales-but-food-and-medicine-price-cuts-remain-elusive-survey-13615720.html' },
                    { source: 'Moneycontrol', headline: 'Real Estate News and Updates', url: 'https://www.moneycontrol.com/news/business/real-estate/' },
                    { source: 'Moneycontrol', headline: 'Delhi CM reviews travel arrangements ahead of Diwali', url: 'https://www.moneycontrol.com/news/india/delhi-cm-rekha-gupta-reviews-travel-arrangements-ahead-of-diwali-chhath-festival-at-new-delhi-railway-station-13616243.html' },
                ]);
            }, 600);
         });
    }
};

// --- Helper Components ---
const Shimmer = ({ className }) => <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>;
const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed bottom-5 right-5 ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg transition-transform transform animate-bounce`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 font-bold">X</button>
        </div>
    );
};
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                {children}
            </div>
        </div>
    );
};

// --- Main Components ---
function AuthForm({ isLogin, onAuthSuccess, onToggleView }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                const data = await api.login(email, password);
                localStorage.setItem('token', data.token);
                onAuthSuccess();
            } else {
                await api.signup(username, email, password);
                setSignupSuccess(true);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerification = async () => {
        setIsLoading(true);
        setError('');
        try {
            await api.verifyEmail(email);
            const data = await api.login(email, password);
            localStorage.setItem('token', data.token);
            onAuthSuccess();
        } catch (err) {
             setError(err.message || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    if (signupSuccess) {
        return (
             <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center text-center p-4">
                 <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800">Registration Successful!</h2>
                    <p className="text-gray-600 mt-2">A confirmation request has been sent to <strong>{email}</strong>.</p>
                    <p className="text-gray-500 mt-4">Please check your inbox to continue.</p>
                    <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
                        <p className="text-sm text-yellow-800"><strong>Demo Only:</strong> Since we can't send a real email, please click the button below to simulate verifying your account.</p>
                    </div>
                     <button onClick={handleVerification} disabled={isLoading} className="w-full mt-6 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold disabled:bg-green-300">
                        {isLoading ? 'Verifying...' : 'Click to Verify Email'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-3xl font-bold text-gray-900 mt-2 text-center">{isLogin ? 'Welcome Back!' : 'Create an Account'}</div>
                <div className="text-gray-500 mt-1 text-center">{isLogin ? 'Login to your account' : 'Start your investing journey'}</div>
            </div>
            <div className="max-w-md w-full mx-auto mt-4 bg-white p-8 border border-gray-200 rounded-lg shadow-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-bold text-gray-600 block">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded mt-1"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mt-1"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mt-1"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm font-semibold disabled:bg-indigo-300">
                            {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                        </button>
                    </div>
                </form>
            </div>
             <div className="mt-4 text-center">
                <button onClick={onToggleView} className="text-indigo-600 hover:underline text-sm">
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
            </div>
        </div>
    );
}

function StockChart({ symbol }) {
    const [chartData, setChartData] = useState(null);
    const [timeframe, setTimeframe] = useState('1m');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!symbol) return;
            setIsLoading(true);
            try {
                const data = await api.getStockHistory(symbol);
                const processedData = {
                    labels: data[timeframe].map(d => d.date),
                    datasets: [
                        {
                            label: `${symbol} Price`,
                            data: data[timeframe].map(d => d.price),
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                        },
                    ],
                };
                setChartData(processedData);
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [symbol, timeframe]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: `${symbol} Price History (${timeframe})` },
        },
        scales: {
            x: {
                type: 'category',
                grid: { display: false },
            },
            y: {
                grid: { color: 'rgba(200, 200, 200, 0.2)' }
            }
        }
    };

    if (isLoading) return <Shimmer className="h-64 w-full" />;
    if (!chartData) return <div className="h-64 flex items-center justify-center text-gray-500">No chart data available.</div>;

    return (
        <div>
            <div className="flex justify-end space-x-2 mb-2">
                <button onClick={() => setTimeframe('1w')} className={`px-2 py-1 text-xs rounded ${timeframe === '1w' ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>1W</button>
                <button onClick={() => setTimeframe('1m')} className={`px-2 py-1 text-xs rounded ${timeframe === '1m' ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>1M</button>
            </div>
            <Line options={chartOptions} data={chartData} />
        </div>
    );
}

function TradeModal({ stock, cash, onTradeSuccess, onClose }) {
    const [tradeType, setTradeType] = useState('BUY');
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const totalCost = (quantity * stock.price).toFixed(2);
    
    const handleTrade = async () => {
        if (quantity <= 0) {
            setError('Quantity must be positive.');
            return;
        }
        
        setError('');
        setIsLoading(true);
        try {
            if (tradeType === 'BUY') {
                if (totalCost > cash) {
                    setError('Insufficient funds.');
                    setIsLoading(false);
                    return;
                }
                await api.buyStock(stock.symbol, quantity, stock.price);
            } else {
                 await api.sellStock(stock.symbol, quantity, stock.price);
            }
            onTradeSuccess(`${tradeType === 'BUY' ? 'Bought' : 'Sold'} ${quantity} shares of ${stock.symbol}`);
        } catch (err) {
            setError(err.message || 'Trade failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal isOpen={!!stock} onClose={onClose}>
            <h2 className="text-2xl font-bold mb-4">Trade {stock.symbol}</h2>
            <div className="mb-4">
                <p><strong>Company:</strong> {stock.name}</p>
                <p><strong>Current Price:</strong> ${stock.price.toFixed(2)}</p>
                <p><strong>Available Cash:</strong> ${cash.toFixed(2)}</p>
            </div>

            <div className="flex space-x-2 mb-4">
                <button onClick={() => setTradeType('BUY')} className={`w-full py-2 rounded ${tradeType === 'BUY' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>Buy</button>
                <button onClick={() => setTradeType('SELL')} className={`w-full py-2 rounded ${tradeType === 'SELL' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>Sell</button>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    min="1"
                />
            </div>

            <div className="text-lg font-semibold mb-4">
                Total: ${totalCost}
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            <button onClick={handleTrade} disabled={isLoading} className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold disabled:bg-indigo-300">
                {isLoading ? 'Processing...' : `Confirm ${tradeType}`}
            </button>
        </Modal>
    );
}

function Dashboard({ portfolio, onTrade, onLogout }) {
    const [searchTerm, setSearchTerm] = useState('AAPL');
    const [searchedStock, setSearchedStock] = useState(null);
    const [news, setNews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [tradeModalStock, setTradeModalStock] = useState(null);

    const handleSearch = useCallback(async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        const termToSearch = (typeof e === 'string') ? e : searchTerm;
        if (!termToSearch) return;
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getStockQuote(termToSearch);
            setSearchedStock(data);
        } catch (err) {
            setError(err.message || 'Stock not found.');
            setSearchedStock(null);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);
    
    useEffect(() => {
        handleSearch('AAPL');
        
        const fetchNews = async () => {
            try {
                const newsData = await api.getNews();
                setNews(newsData);
            } catch (error) {
                console.error("Failed to fetch news", error);
            }
        };
        fetchNews();
    }, [handleSearch]);
    
    const totalPortfolioValue = useMemo(() => {
        const holdingsValue = portfolio.holdings.reduce((acc, h) => {
            return acc + (h.quantity * h.avgPrice);
        }, 0);
        return portfolio.user.cash + holdingsValue;
    }, [portfolio.holdings, portfolio.user.cash]);

    const handleViewHolding = (symbol) => {
        setSearchTerm(symbol);
        handleSearch(symbol);
    }

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500">Welcome, {portfolio.user.username}!</p>
                </div>
                <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
            </header>

            {tradeModalStock && (
                <TradeModal 
                    stock={tradeModalStock} 
                    cash={portfolio.user.cash}
                    onTradeSuccess={(message) => {
                        onTrade(message);
                        setTradeModalStock(null);
                    }}
                    onClose={() => setTradeModalStock(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Portfolio Value</h3>
                            <p className="text-3xl font-semibold text-gray-900">${totalPortfolioValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Available Cash</h3>
                            <p className="text-3xl font-semibold text-gray-900">${portfolio.user.cash.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4">My Holdings</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-4">Symbol</th>
                                        <th className="py-2 px-4">Quantity</th>
                                        <th className="py-2 px-4">Avg. Price</th>
                                        <th className="py-2 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.holdings.length > 0 ? portfolio.holdings.map(holding => (
                                        <tr key={holding.symbol} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium">{holding.symbol}</td>
                                            <td className="py-3 px-4">{holding.quantity}</td>
                                            <td className="py-3 px-4">${holding.avgPrice.toFixed(2)}</td>
                                            <td className="py-3 px-4">
                                                <button onClick={() => handleViewHolding(holding.symbol)} className="text-indigo-600 hover:underline text-sm">View</button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="text-center py-4 text-gray-500">No holdings yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4">Stock Search</h3>
                        <form onSubmit={handleSearch} className="flex space-x-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                                placeholder="e.g., AAPL"
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Search</button>
                        </form>
                        {isLoading && <p className="mt-4">Loading...</p>}
                        {error && <p className="mt-4 text-red-500">{error}</p>}
                        {searchedStock && (
                            <div className="mt-6 space-y-4">
                                <div>
                                    <h4 className="text-2xl font-bold">{searchedStock.symbol}</h4>
                                    <p className="text-gray-600">{searchedStock.name}</p>
                                </div>
                                <p className="text-4xl font-light">${searchedStock.price.toFixed(2)}</p>
                                <div>
                                  <StockChart symbol={searchedStock.symbol} />
                                </div>
                                <button onClick={() => setTradeModalStock(searchedStock)} className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600">Trade</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4">Market News</h3>
                        <ul className="space-y-3">
                            {news.map((item, index) => (
                                <li key={index} className="border-b pb-2">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">{item.headline}</a>
                                    <p className="text-xs text-gray-500">{item.source}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- App Container ---
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [isLoginView, setIsLoginView] = useState(true);
    const [portfolio, setPortfolio] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    const fetchPortfolio = useCallback(async () => {
        if (!isAuthenticated) {
             setIsLoading(false);
             return;
        }
        setIsLoading(true);
        try {
            const data = await api.getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to fetch portfolio', error);
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setPortfolio(null);
    };
    
    const handleTrade = (message) => {
        showToast(message, 'success');
        fetchPortfolio();
    };
    
    useEffect(() => {
        if (isAuthenticated) {
            fetchPortfolio();
        }
    }, [isAuthenticated, fetchPortfolio]);

    if (!isAuthenticated) {
        return (
            <AuthForm 
                isLogin={isLoginView} 
                onAuthSuccess={handleAuthSuccess}
                onToggleView={() => setIsLoginView(!isLoginView)}
            />
        );
    }

    if (isLoading || !portfolio) {
        return <div className="min-h-screen flex items-center justify-center text-xl">Loading your portfolio...</div>;
    }

    return (
        <div>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
            <Dashboard portfolio={portfolio} onTrade={handleTrade} onLogout={handleLogout} />
        </div>
    );
}

