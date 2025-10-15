const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');

const router = express.Router();

// --- Get Portfolio Data ---
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const holdings = await Holding.find({ userId: req.user.id });
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });

    res.json({ user, holdings, transactions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Buy Stock ---
router.post('/buy', authMiddleware, async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const userId = req.user.id;

    if (!symbol || !quantity || !price || quantity <= 0 || price <= 0) {
        return res.status(400).json({ msg: 'Invalid transaction data' });
    }

    const totalCost = quantity * price;

    try {
        const user = await User.findById(userId);
        if (user.cash < totalCost) {
            return res.status(400).json({ msg: 'Insufficient funds' });
        }

        // Update user's cash
        user.cash -= totalCost;
        await user.save();

        // Update holdings
        let holding = await Holding.findOne({ userId, symbol });
        if (holding) {
            const newTotalQuantity = holding.quantity + quantity;
            const newAvgPrice = ((holding.avgPrice * holding.quantity) + totalCost) / newTotalQuantity;
            holding.quantity = newTotalQuantity;
            holding.avgPrice = newAvgPrice;
        } else {
            holding = new Holding({
                userId,
                symbol,
                quantity,
                avgPrice: price,
            });
        }
        await holding.save();

        // Create transaction record
        const transaction = new Transaction({
            userId,
            type: 'BUY',
            symbol,
            quantity,
            price,
        });
        await transaction.save();
        
        res.status(200).json({ msg: 'Stock purchased successfully', user, holding });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Sell Stock ---
router.post('/sell', authMiddleware, async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const userId = req.user.id;
    
    if (!symbol || !quantity || !price || quantity <= 0 || price <= 0) {
        return res.status(400).json({ msg: 'Invalid transaction data' });
    }
    
    const totalProceeds = quantity * price;

    try {
        const user = await User.findById(userId);
        let holding = await Holding.findOne({ userId, symbol });

        if (!holding || holding.quantity < quantity) {
            return res.status(400).json({ msg: 'Insufficient stock holdings' });
        }

        // Update user's cash
        user.cash += totalProceeds;
        await user.save();

        // Update holdings
        holding.quantity -= quantity;
        if (holding.quantity === 0) {
            await Holding.deleteOne({ _id: holding._id });
             holding = null; // To reflect it's gone
        } else {
            // Average price doesn't change on sell
            await holding.save();
        }

        // Create transaction record
        const transaction = new Transaction({
            userId,
            type: 'SELL',
            symbol,
            quantity,
            price,
        });
        await transaction.save();

        res.status(200).json({ msg: 'Stock sold successfully', user, holding });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
