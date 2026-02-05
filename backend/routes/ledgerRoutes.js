import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import * as ledgerService from '../services/ledgerService.js';
import StockLedger from '../models/StockLedger.js';

const router = express.Router();

/**
 * @route   GET /api/ledger/item/:itemId
 * @desc    Get ledger history for an item
 * @access  Private
 */
router.get('/item/:itemId', protect, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { startDate, endDate } = req.query;

        const history = await ledgerService.reconstructHistory(
            itemId,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
        );

        res.json({
            success: true,
            itemId,
            entries: history,
            count: history.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/item/:itemId/balance
 * @desc    Get current or point-in-time balance for an item
 * @access  Private
 */
router.get('/item/:itemId/balance', protect, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { asOfDate } = req.query;

        const balance = await ledgerService.getRunningBalance(
            itemId,
            asOfDate ? new Date(asOfDate) : null
        );

        res.json({
            success: true,
            itemId,
            balance,
            asOfDate: asOfDate || new Date()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/reconcile/:itemId
 * @desc    Reconcile ledger balance with Item.stockQty
 * @access  Private
 */
router.get('/reconcile/:itemId', protect, async (req, res) => {
    try {
        const { itemId } = req.params;
        const result = await ledgerService.reconcile(itemId);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/reconcile-all
 * @desc    Reconcile all items
 * @access  Private
 */
router.get('/reconcile-all', protect, async (req, res) => {
    try {
        const results = await ledgerService.reconcileAll();

        res.json({
            success: true,
            ...results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/source/:sourceType/:sourceId
 * @desc    Get ledger entries for a source document
 * @access  Private
 */
router.get('/source/:sourceType/:sourceId', protect, async (req, res) => {
    try {
        const { sourceType, sourceId } = req.params;
        const entries = await ledgerService.getEntriesBySource(sourceType, sourceId);

        res.json({
            success: true,
            sourceType,
            sourceId,
            entries,
            count: entries.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/valuation
 * @desc    Get inventory valuation
 * @access  Private
 */
router.get('/valuation', protect, async (req, res) => {
    try {
        const { asOfDate } = req.query;

        const valuation = await ledgerService.getInventoryValuation(
            asOfDate ? new Date(asOfDate) : null
        );

        res.json({
            success: true,
            ...valuation
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/ledger/stats
 * @desc    Get ledger statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
    try {
        const totalEntries = await StockLedger.countDocuments();

        const transactionStats = await StockLedger.aggregate([
            {
                $group: {
                    _id: '$transactionType',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantityChange' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const recentEntries = await StockLedger
            .find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('item', 'name sku')
            .populate('createdBy', 'name');

        res.json({
            success: true,
            totalEntries,
            transactionStats,
            recentEntries
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
