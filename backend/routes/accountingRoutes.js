import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authorize.js';
import * as accountingService from '../services/accountingService.js';
import JournalEntry from '../models/JournalEntry.js';
import { validatePeriodLock } from '../middlewares/periodLockingMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/accounting/journal-entries
 * @desc    Create journal entry
 * @access  Private - accounting:edit
 */
router.post('/journal-entries', protect, authorize('accounting:edit'), validatePeriodLock, async (req, res) => {
    try {
        const { date, lines, memo } = req.body;

        const result = await accountingService.createJournalEntry({
            date: date ? new Date(date) : new Date(),
            sourceDocument: {
                type: 'Manual',
                id: null
            },
            lines,
            memo,
            organizationId: req.tenant?.organizationId,
            userId: req.user._id,
            autoPost: false
        });

        res.status(201).json({
            success: true,
            entry: result.entry
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/accounting/journal-entries/:id/post
 * @desc    Post journal entry
 * @access  Private - accounting:post
 */
router.post('/journal-entries/:id/post', protect, authorize('accounting:post'), validatePeriodLock, async (req, res) => {
    try {
        const result = await accountingService.postJournalEntry(
            req.params.id,
            req.user._id
        );

        res.json({
            success: true,
            entry: result.entry
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/accounting/journal-entries/:id/void
 * @desc    Void journal entry
 * @access  Private - accounting:post
 */
router.post('/journal-entries/:id/void', protect, authorize('accounting:post'), async (req, res) => {
    try {
        const { reason } = req.body;

        const result = await accountingService.voidJournalEntry(
            req.params.id,
            req.user._id,
            reason
        );

        res.json({
            success: true,
            entry: result.entry
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/accounting/trial-balance
 * @desc    Generate trial balance
 * @access  Private - accounting:view
 */
router.get('/trial-balance', protect, authorize('accounting:view'), async (req, res) => {
    try {
        const { asOfDate } = req.query;

        const trialBalance = await accountingService.generateTrialBalance(
            req.tenant?.organizationId,
            asOfDate ? new Date(asOfDate) : new Date()
        );

        res.json({
            success: true,
            ...trialBalance
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/accounting/profit-loss
 * @desc    Generate P&L statement
 * @access  Private - report:financial
 */
router.get('/profit-loss', protect, authorize('report:financial'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const profitLoss = await accountingService.generateProfitAndLoss(
            req.tenant?.organizationId,
            new Date(startDate),
            new Date(endDate)
        );

        res.json({
            success: true,
            ...profitLoss
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/accounting/journal-entries
 * @desc    Get journal entries
 * @access  Private - accounting:view
 */
router.get('/journal-entries', protect, authorize('accounting:view'), async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

        const query = {
            organization: req.tenant?.organizationId
        };

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const entries = await JournalEntry
            .find(query)
            .populate('lines.account', 'code name')
            .populate('createdBy', 'name email')
            .sort({ date: -1, entryNumber: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await JournalEntry.countDocuments(query);

        res.json({
            success: true,
            entries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
