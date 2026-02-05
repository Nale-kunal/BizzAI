import express from 'express';
import * as financialPeriodService from '../services/financialPeriodService.js';
import { protect } from '../middlewares/authMiddleware.js';
import { tenantContext } from '../middlewares/tenantContext.js';
import { authorize } from '../middlewares/authorize.js';

const router = express.Router();

// All routes require authentication and tenant context
router.use(protect);
router.use(tenantContext);

/**
 * GET /api/financial-periods
 * List all periods for organization
 */
router.get(
    '/',
    authorize(['financial_periods:read'], 'any'),
    async (req, res) => {
        try {
            const { status, fiscalYear } = req.query;
            const filters = {};

            if (status) filters.status = status;
            if (fiscalYear) filters.fiscalYear = parseInt(fiscalYear);

            const periods = await financialPeriodService.getPeriods(
                req.tenant.organizationId,
                filters
            );

            res.json({
                success: true,
                data: periods
            });
        } catch (error) {
            console.error('Get periods error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch financial periods',
                error: error.message
            });
        }
    }
);

/**
 * POST /api/financial-periods
 * Create a new period
 */
router.post(
    '/',
    authorize(['financial_periods:create'], 'any'),
    async (req, res) => {
        try {
            const { name, fiscalYear, startDate, endDate, notes } = req.body;

            if (!name || !fiscalYear || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: name, fiscalYear, startDate, endDate'
                });
            }

            const period = await financialPeriodService.createPeriod(
                req.tenant.organizationId,
                { name, fiscalYear, startDate, endDate, notes },
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: 'Financial period created successfully',
                data: period
            });
        } catch (error) {
            console.error('Create period error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create financial period'
            });
        }
    }
);

/**
 * POST /api/financial-periods/generate/:fiscalYear
 * Generate all periods for a fiscal year
 */
router.post(
    '/generate/:fiscalYear',
    authorize(['financial_periods:create'], 'any'),
    async (req, res) => {
        try {
            const fiscalYear = parseInt(req.params.fiscalYear);

            if (!fiscalYear || fiscalYear < 2000 || fiscalYear > 2100) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fiscal year'
                });
            }

            const periods = await financialPeriodService.generatePeriodsForFiscalYear(
                req.tenant.organizationId,
                fiscalYear,
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: `Generated ${periods.length} periods for fiscal year ${fiscalYear}`,
                data: periods
            });
        } catch (error) {
            console.error('Generate periods error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to generate periods'
            });
        }
    }
);

/**
 * PUT /api/financial-periods/:id/lock
 * Lock a period
 */
router.put(
    '/:id/lock',
    authorize(['financial_periods:lock'], 'any'),
    async (req, res) => {
        try {
            const period = await financialPeriodService.lockPeriod(
                req.params.id,
                req.user._id
            );

            res.json({
                success: true,
                message: 'Financial period locked successfully',
                data: period
            });
        } catch (error) {
            console.error('Lock period error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to lock period'
            });
        }
    }
);

/**
 * PUT /api/financial-periods/:id/unlock
 * Unlock a period
 */
router.put(
    '/:id/unlock',
    authorize(['financial_periods:lock'], 'any'),
    async (req, res) => {
        try {
            const period = await financialPeriodService.unlockPeriod(
                req.params.id,
                req.user._id
            );

            res.json({
                success: true,
                message: 'Financial period unlocked successfully',
                data: period
            });
        } catch (error) {
            console.error('Unlock period error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to unlock period'
            });
        }
    }
);

/**
 * PUT /api/financial-periods/:id/close
 * Close a period (permanent)
 */
router.put(
    '/:id/close',
    authorize(['financial_periods:close'], 'any'),
    async (req, res) => {
        try {
            const period = await financialPeriodService.closePeriod(
                req.params.id,
                req.user._id
            );

            res.json({
                success: true,
                message: 'Financial period closed successfully',
                data: period
            });
        } catch (error) {
            console.error('Close period error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to close period'
            });
        }
    }
);

export default router;
