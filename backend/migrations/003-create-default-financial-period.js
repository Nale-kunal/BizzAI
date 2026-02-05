/**
 * Migration: Create Default Financial Period
 * 
 * Creates a default open financial period for the current fiscal year
 * and assigns all existing journal entries to it.
 * 
 * This ensures backward compatibility and allows period locking to work.
 */

import mongoose from 'mongoose';
import FinancialPeriod from '../models/FinancialPeriod.js';
import JournalEntry from '../models/JournalEntry.js';
import Organization from '../models/Organization.js';

export async function up() {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            console.log('📅 Creating default financial periods...');

            // Get all organizations
            const organizations = await Organization.find({}).session(session);

            if (organizations.length === 0) {
                console.log('⚠️  No organizations found. Skipping period creation.');
                return;
            }

            for (const org of organizations) {
                console.log(`\n📊 Processing organization: ${org.name}`);

                // Determine fiscal year start month (default April = 4)
                const fiscalYearStart = org.settings?.fiscalYearStart || 4;

                // Calculate current fiscal year
                const now = new Date();
                const currentMonth = now.getMonth() + 1; // 1-12
                const currentYear = now.getFullYear();

                // If we're before fiscal year start, we're in previous fiscal year
                const fiscalYear = currentMonth < fiscalYearStart
                    ? currentYear - 1
                    : currentYear;

                // Create fiscal year start and end dates
                const fiscalYearStartDate = new Date(fiscalYear, fiscalYearStart - 1, 1);
                const fiscalYearEndDate = new Date(fiscalYear + 1, fiscalYearStart - 1, 0);

                // Check if period already exists
                const existingPeriod = await FinancialPeriod.findOne({
                    organization: org._id,
                    fiscalYear
                }).session(session);

                if (existingPeriod) {
                    console.log(`✅ Period already exists for FY ${fiscalYear}`);
                    continue;
                }

                // Create default period
                const period = await FinancialPeriod.create(
                    [
                        {
                            name: `FY ${fiscalYear}-${fiscalYear + 1}`,
                            fiscalYear,
                            startDate: fiscalYearStartDate,
                            endDate: fiscalYearEndDate,
                            status: 'open',
                            organization: org._id,
                            createdBy: org.createdBy || org._id,
                            notes: 'Default period created by migration'
                        }
                    ],
                    { session }
                );

                console.log(`✅ Created default period: ${period[0].name}`);

                // Update all existing journal entries to reference this period
                const updateResult = await JournalEntry.updateMany(
                    {
                        organization: org._id,
                        financialPeriod: { $exists: false }
                    },
                    {
                        $set: { financialPeriod: period[0]._id }
                    },
                    { session }
                );

                console.log(`✅ Updated ${updateResult.modifiedCount} journal entries`);
            }

            console.log('\n✅ Default financial periods created successfully');
        });
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export async function down() {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            console.log('🔄 Rolling back default financial periods...');

            // Remove financialPeriod from journal entries
            await JournalEntry.updateMany(
                {},
                { $unset: { financialPeriod: '' } },
                { session }
            );

            // Delete all financial periods
            const result = await FinancialPeriod.deleteMany({}, { session });

            console.log(`✅ Removed ${result.deletedCount} financial periods`);
            console.log('✅ Rollback complete');
        });
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export default { up, down };

