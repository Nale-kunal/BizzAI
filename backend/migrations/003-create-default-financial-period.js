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
    // Check if MongoDB is running as a replica set
    const mongoUri = process.env.MONGO_URI || '';
    const isReplicaSet = mongoUri.includes('replicaSet=') || mongoUri.startsWith('mongodb+srv://');

    const session = await mongoose.startSession();

    try {
        // Define migration logic
        const runMigration = async (session) => {
            console.log('📅 Creating default financial periods...');

            // Get all organizations
            const organizations = isReplicaSet
                ? await Organization.find({}).session(session)
                : await Organization.find({});

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
                const existingPeriod = isReplicaSet
                    ? await FinancialPeriod.findOne({ organization: org._id, fiscalYear }).session(session)
                    : await FinancialPeriod.findOne({ organization: org._id, fiscalYear });

                if (existingPeriod) {
                    console.log(`✅ Period already exists for FY ${fiscalYear}`);
                    continue;
                }

                // Create default period
                const createOptions = isReplicaSet ? { session } : {};
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
                    createOptions
                );

                console.log(`✅ Created default period: ${period[0].name}`);

                // Update all existing journal entries to reference this period
                const updateOptions = isReplicaSet ? { session } : {};
                const updateResult = await JournalEntry.updateMany(
                    {
                        organization: org._id,
                        financialPeriod: { $exists: false }
                    },
                    {
                        $set: { financialPeriod: period[0]._id }
                    },
                    updateOptions
                );

                console.log(`✅ Updated ${updateResult.modifiedCount} journal entries`);
            }

            console.log('\n✅ Default financial periods created successfully');
        };

        // Use transactions only if replica set is available
        if (isReplicaSet) {
            console.log('🔄 Running migration with transactions (replica set detected)');
            await session.withTransaction(async () => {
                await runMigration(session);
            });
        } else {
            console.log('🔄 Running migration without transactions (standalone MongoDB)');
            await runMigration(null);
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export async function down() {
    // Check if MongoDB is running as a replica set
    const mongoUri = process.env.MONGO_URI || '';
    const isReplicaSet = mongoUri.includes('replicaSet=') || mongoUri.startsWith('mongodb+srv://');

    const session = await mongoose.startSession();

    try {
        // Define rollback logic
        const runRollback = async (session) => {
            console.log('🔄 Rolling back default financial periods...');

            // Remove financialPeriod from journal entries
            const updateOptions = isReplicaSet ? { session } : {};
            await JournalEntry.updateMany(
                {},
                { $unset: { financialPeriod: '' } },
                updateOptions
            );

            // Delete all financial periods
            const result = await FinancialPeriod.deleteMany({}, updateOptions);

            console.log(`✅ Removed ${result.deletedCount} financial periods`);
            console.log('✅ Rollback complete');
        };

        // Use transactions only if replica set is available
        if (isReplicaSet) {
            console.log('🔄 Running rollback with transactions (replica set detected)');
            await session.withTransaction(async () => {
                await runRollback(session);
            });
        } else {
            console.log('🔄 Running rollback without transactions (standalone MongoDB)');
            await runRollback(null);
        }
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export default { up, down };

