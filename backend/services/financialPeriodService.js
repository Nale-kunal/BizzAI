import FinancialPeriod from '../models/FinancialPeriod.js';
import Organization from '../models/Organization.js';
import mongoose from 'mongoose';

/**
 * Financial Period Service
 * 
 * Manages fiscal periods, locking, and closing
 */

/**
 * Create a new financial period
 */
export const createPeriod = async (organizationId, periodData, userId) => {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            // Validate organization
            const org = await Organization.findById(organizationId).session(session);
            if (!org) {
                throw new Error('Organization not found');
            }

            // Check for overlapping periods
            const overlapping = await FinancialPeriod.findOne({
                organization: organizationId,
                $or: [
                    {
                        startDate: { $lte: periodData.endDate },
                        endDate: { $gte: periodData.startDate }
                    }
                ]
            }).session(session);

            if (overlapping) {
                throw new Error(
                    `Period overlaps with existing period "${overlapping.name}"`
                );
            }

            // Create period
            const period = await FinancialPeriod.create(
                [
                    {
                        ...periodData,
                        organization: organizationId,
                        createdBy: userId,
                        status: 'open'
                    }
                ],
                { session }
            );

            return period[0];
        });
    } finally {
        session.endSession();
    }
};

/**
 * Lock a financial period
 */
export const lockPeriod = async (periodId, userId) => {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            const period = await FinancialPeriod.findById(periodId).session(session);

            if (!period) {
                throw new Error('Financial period not found');
            }

            if (period.status === 'closed') {
                throw new Error('Cannot lock a closed period');
            }

            if (period.status === 'locked') {
                throw new Error('Period is already locked');
            }

            period.status = 'locked';
            period.lockedAt = new Date();
            period.lockedBy = userId;

            await period.save({ session });

            return period;
        });
    } finally {
        session.endSession();
    }
};

/**
 * Unlock a financial period
 */
export const unlockPeriod = async (periodId, userId) => {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            const period = await FinancialPeriod.findById(periodId).session(session);

            if (!period) {
                throw new Error('Financial period not found');
            }

            if (period.status === 'closed') {
                throw new Error('Cannot unlock a closed period');
            }

            if (period.status === 'open') {
                throw new Error('Period is already open');
            }

            period.status = 'open';
            period.lockedAt = null;
            period.lockedBy = null;

            await period.save({ session });

            return period;
        });
    } finally {
        session.endSession();
    }
};

/**
 * Close a financial period (permanent)
 */
export const closePeriod = async (periodId, userId) => {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            const period = await FinancialPeriod.findById(periodId).session(session);

            if (!period) {
                throw new Error('Financial period not found');
            }

            if (period.status === 'closed') {
                throw new Error('Period is already closed');
            }

            // TODO: Validate all journal entries are posted
            // TODO: Validate trial balance

            period.status = 'closed';
            period.closedAt = new Date();
            period.closedBy = userId;

            await period.save({ session });

            return period;
        });
    } finally {
        session.endSession();
    }
};

/**
 * Generate periods for a fiscal year
 */
export const generatePeriodsForFiscalYear = async (
    organizationId,
    fiscalYear,
    userId
) => {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            const org = await Organization.findById(organizationId).session(session);
            if (!org) {
                throw new Error('Organization not found');
            }

            const fiscalYearStart = org.settings?.fiscalYearStart || 4; // Default April

            const periods = [];
            const startYear = fiscalYear;
            const endYear = fiscalYear + 1;

            // Generate 12 monthly periods
            for (let month = 0; month < 12; month++) {
                const periodMonth = (fiscalYearStart + month - 1) % 12;
                const periodYear = periodMonth < fiscalYearStart - 1 ? endYear : startYear;

                const startDate = new Date(periodYear, periodMonth, 1);
                const endDate = new Date(periodYear, periodMonth + 1, 0); // Last day of month

                const monthNames = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];

                periods.push({
                    name: `${monthNames[periodMonth]} ${periodYear}`,
                    fiscalYear,
                    startDate,
                    endDate,
                    organization: organizationId,
                    createdBy: userId,
                    status: 'open'
                });
            }

            const created = await FinancialPeriod.insertMany(periods, { session });

            return created;
        });
    } finally {
        session.endSession();
    }
};

/**
 * Get all periods for organization
 */
export const getPeriods = async (organizationId, filters = {}) => {
    const query = { organization: organizationId, ...filters };

    return await FinancialPeriod.find(query)
        .sort({ startDate: -1 })
        .populate('createdBy', 'name email')
        .populate('lockedBy', 'name email')
        .populate('closedBy', 'name email');
};

export default {
    createPeriod,
    lockPeriod,
    unlockPeriod,
    closePeriod,
    generatePeriodsForFiscalYear,
    getPeriods
};
