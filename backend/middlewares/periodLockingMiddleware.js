import FinancialPeriod from '../models/FinancialPeriod.js';

/**
 * Period Locking Middleware
 * 
 * Prevents creation/modification of financial transactions in locked or closed periods
 * 
 * Usage:
 *   router.post('/api/invoices', periodLockingMiddleware, createInvoice);
 */

/**
 * Validate that transaction date is in an open period
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export const validatePeriodLock = async (req, res, next) => {
    try {
        // Extract transaction date from request body
        // Support multiple date field names
        const transactionDate =
            req.body.date ||
            req.body.transactionDate ||
            req.body.invoiceDate ||
            req.body.purchaseDate ||
            req.body.paymentDate ||
            new Date();

        // Get organization from tenant context
        const organizationId = req.tenant?.organizationId;

        // If no organization context, skip period validation (backward compatibility)
        // This allows non-enterprise users to continue working without organization setup
        if (!organizationId) {
            console.log('No organization context - skipping period validation');
            return next();
        }

        // Find period for this date
        const period = await FinancialPeriod.findPeriodForDate(
            organizationId,
            transactionDate
        );

        if (!period) {
            return res.status(400).json({
                success: false,
                message: `No financial period found for date ${new Date(transactionDate).toLocaleDateString()}. Please create a period first.`,
                transactionDate
            });
        }

        // Check if period is locked or closed
        if (period.status === 'locked') {
            return res.status(403).json({
                success: false,
                message: `Financial period "${period.name}" is locked. No transactions allowed.`,
                period: {
                    name: period.name,
                    status: period.status,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    lockedAt: period.lockedAt
                }
            });
        }

        if (period.status === 'closed') {
            return res.status(403).json({
                success: false,
                message: `Financial period "${period.name}" is closed. No transactions allowed.`,
                period: {
                    name: period.name,
                    status: period.status,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    closedAt: period.closedAt
                }
            });
        }

        // Attach period to request for use in controller
        req.financialPeriod = period;

        next();
    } catch (error) {
        console.error('Period locking validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate financial period',
            error: error.message
        });
    }
};

/**
 * Validate period lock for updates/voids
 * Checks the EXISTING document's date, not the new date
 */
export const validatePeriodLockForUpdate = (Model) => {
    return async (req, res, next) => {
        try {
            const documentId = req.params.id;
            const organizationId = req.tenant?.organizationId;

            // If no organization context, skip period validation (backward compatibility)
            if (!organizationId) {
                console.log('No organization context - skipping period lock validation for update');
                return next();
            }

            // Fetch existing document
            const document = await Model.findById(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            // Get document date
            const documentDate =
                document.date ||
                document.transactionDate ||
                document.invoiceDate ||
                document.purchaseDate ||
                document.paymentDate ||
                document.createdAt;

            // Find period
            const period = await FinancialPeriod.findPeriodForDate(
                organizationId,
                documentDate
            );

            if (!period) {
                return res.status(400).json({
                    success: false,
                    message: `No financial period found for document date`
                });
            }

            // Check lock status
            if (period.status === 'locked' || period.status === 'closed') {
                return res.status(403).json({
                    success: false,
                    message: `Cannot modify document in ${period.status} period "${period.name}"`,
                    period: {
                        name: period.name,
                        status: period.status,
                        startDate: period.startDate,
                        endDate: period.endDate
                    }
                });
            }

            req.financialPeriod = period;
            next();
        } catch (error) {
            console.error('Period lock validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate period lock',
                error: error.message
            });
        }
    };
};

export default {
    validatePeriodLock,
    validatePeriodLockForUpdate
};
