/**
 * GDPR API Routes
 * 
 * Endpoints for GDPR compliance: DSAR, legal holds, retention policies
 */

import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authorize.js';
import gdprService from '../services/gdprService.js';
import retentionService from '../services/retentionService.js';

const router = express.Router();

// ============================================================================
// DSAR Routes
// ============================================================================

/**
 * @route   POST /api/gdpr/dsar
 * @desc    Create Data Subject Access Request
 * @access  Private
 */
router.post('/dsar', protect, async (req, res) => {
    try {
        const { requestType, notes } = req.body;

        const dsar = await gdprService.createDSAR(
            req.user._id,
            req.user.organization,
            requestType,
            notes
        );

        res.status(201).json({
            success: true,
            data: dsar
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/gdpr/dsar
 * @desc    Get all DSARs for organization
 * @access  Private (Admin only)
 */
router.get('/dsar', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.query;

        const dsars = await gdprService.getDSARs(req.user.organization, status);

        res.json({
            success: true,
            count: dsars.length,
            data: dsars
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/gdpr/dsar/:id/process
 * @desc    Process DSAR request
 * @access  Private (Admin only)
 */
router.post('/dsar/:id/process', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await gdprService.processDSAR(req.params.id, req.user._id);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/gdpr/erase/:userId
 * @desc    Erase user data (Right to Erasure)
 * @access  Private (Admin only)
 */
router.post('/erase/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await gdprService.eraseUserData(
            req.params.userId,
            req.user.organization,
            req.user._id
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// Legal Hold Routes
// ============================================================================

/**
 * @route   POST /api/gdpr/legal-hold
 * @desc    Create legal hold
 * @access  Private (Admin only)
 */
router.post('/legal-hold', protect, authorize('admin'), async (req, res) => {
    try {
        const { entityType, entityId, reason, caseNumber } = req.body;

        const legalHold = await gdprService.createLegalHold(
            req.user.organization,
            entityType,
            entityId,
            reason,
            caseNumber,
            req.user._id
        );

        res.status(201).json({
            success: true,
            data: legalHold
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/gdpr/legal-hold
 * @desc    Get all legal holds
 * @access  Private (Admin only)
 */
router.get('/legal-hold', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.query;

        const legalHolds = await gdprService.getLegalHolds(req.user.organization, status);

        res.json({
            success: true,
            count: legalHolds.length,
            data: legalHolds
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/gdpr/legal-hold/:holdId/release
 * @desc    Release legal hold
 * @access  Private (Admin only)
 */
router.post('/legal-hold/:holdId/release', protect, authorize('admin'), async (req, res) => {
    try {
        const legalHold = await gdprService.releaseLegalHold(req.params.holdId, req.user._id);

        res.json({
            success: true,
            data: legalHold
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// Retention Policy Routes
// ============================================================================

/**
 * @route   POST /api/gdpr/retention-policy
 * @desc    Create retention policy
 * @access  Private (Admin only)
 */
router.post('/retention-policy', protect, authorize('admin'), async (req, res) => {
    try {
        const { dataType, retentionPeriodDays, action } = req.body;

        const policy = await retentionService.createRetentionPolicy(
            req.user.organization,
            dataType,
            retentionPeriodDays,
            action,
            req.user._id
        );

        res.status(201).json({
            success: true,
            data: policy
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/gdpr/retention-policy
 * @desc    Get all retention policies
 * @access  Private (Admin only)
 */
router.get('/retention-policy', protect, authorize('admin'), async (req, res) => {
    try {
        const policies = await retentionService.getRetentionPolicies(req.user.organization);

        res.json({
            success: true,
            count: policies.length,
            data: policies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   PUT /api/gdpr/retention-policy/:id
 * @desc    Update retention policy
 * @access  Private (Admin only)
 */
router.put('/retention-policy/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const policy = await retentionService.updateRetentionPolicy(req.params.id, req.body);

        res.json({
            success: true,
            data: policy
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/gdpr/retention-policy/:id
 * @desc    Delete retention policy
 * @access  Private (Admin only)
 */
router.delete('/retention-policy/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await retentionService.deleteRetentionPolicy(req.params.id);

        res.json({
            success: true,
            message: 'Retention policy deleted'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/gdpr/retention-policy/run
 * @desc    Manually run retention job
 * @access  Private (Admin only)
 */
router.post('/retention-policy/run', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await retentionService.runRetentionJob();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
