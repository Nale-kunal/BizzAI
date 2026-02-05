import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import * as complianceService from '../services/complianceService.js';

const router = express.Router();

/**
 * @route   GET /api/compliance/export-data
 * @desc    Export user data (GDPR Right to Data Portability)
 * @access  Private
 */
router.get('/export-data', protect, async (req, res) => {
    try {
        const result = await complianceService.exportUserData(req.user._id);

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
 * @route   POST /api/compliance/erase-data
 * @desc    Erase user data (GDPR Right to be Forgotten)
 * @access  Private
 */
router.post('/erase-data', protect, async (req, res) => {
    try {
        const { reason, confirmEmail } = req.body;

        // Verify email confirmation
        if (confirmEmail !== req.user.email) {
            return res.status(400).json({
                success: false,
                message: 'Email confirmation does not match'
            });
        }

        const result = await complianceService.eraseUserData(req.user._id, reason);

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
 * @route   GET /api/compliance/consent
 * @desc    Get user consent status
 * @access  Private
 */
router.get('/consent', protect, async (req, res) => {
    try {
        const result = await complianceService.getUserConsent(req.user._id);

        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   PUT /api/compliance/consent
 * @desc    Update user consent
 * @access  Private
 */
router.put('/consent', protect, async (req, res) => {
    try {
        const { marketing, analytics, thirdParty } = req.body;

        const result = await complianceService.updateUserConsent(req.user._id, {
            marketing: Boolean(marketing),
            analytics: Boolean(analytics),
            thirdParty: Boolean(thirdParty)
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/compliance/retention-report
 * @desc    Generate data retention report (Admin only)
 * @access  Private - admin
 */
router.get('/retention-report', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.roles || req.user.roles.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const result = await complianceService.generateRetentionReport(
            req.tenant?.organizationId
        );

        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
