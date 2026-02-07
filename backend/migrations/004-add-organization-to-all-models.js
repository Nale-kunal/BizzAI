/**
 * Migration: Add organizationId to All Models
 * 
 * Adds organizationId field to all domain models and assigns
 * all existing documents to the default organization.
 * 
 * This enables full multi-tenant enforcement.
 */

import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Purchase from '../models/Purchase.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Bill from '../models/Bill.js';
import PaymentIn from '../models/PaymentIn.js';
import PaymentOut from '../models/PaymentOut.js';
import Return from '../models/Return.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Expense from '../models/Expense.js';
import BankAccount from '../models/BankAccount.js';
import StockLedger from '../models/StockLedger.js';

export async function up() {
    // Check if MongoDB is running as a replica set
    const mongoUri = process.env.MONGO_URI || '';
    const isReplicaSet = mongoUri.includes('replicaSet=') || mongoUri.startsWith('mongodb+srv://');

    const session = await mongoose.startSession();

    try {
        // Define migration logic
        const runMigration = async (session) => {
            console.log('🏢 Adding organizationId to all models...');

            // Get default organization
            const defaultOrg = isReplicaSet
                ? await Organization.findOne({}).session(session)
                : await Organization.findOne({});

            if (!defaultOrg) {
                throw new Error('No organization found. Please run migration 001 first.');
            }

            console.log(`\n📊 Using default organization: ${defaultOrg.name}`);

            const models = [
                { name: 'Purchase', model: Purchase },
                { name: 'Invoice', model: Invoice },
                { name: 'Item', model: Item },
                { name: 'Customer', model: Customer },
                { name: 'Supplier', model: Supplier },
                { name: 'Bill', model: Bill },
                { name: 'PaymentIn', model: PaymentIn },
                { name: 'PaymentOut', model: PaymentOut },
                { name: 'Return', model: Return },
                { name: 'PurchaseReturn', model: PurchaseReturn },
                { name: 'Expense', model: Expense },
                { name: 'BankAccount', model: BankAccount },
                { name: 'StockLedger', model: StockLedger }
            ];

            for (const { name, model } of models) {
                try {
                    const updateOptions = isReplicaSet ? { session } : {};
                    const result = await model.updateMany(
                        { organizationId: { $exists: false } },
                        { $set: { organizationId: defaultOrg._id } },
                        updateOptions
                    );

                    console.log(`✅ ${name}: Updated ${result.modifiedCount} documents`);

                    // Create index (without session for standalone)
                    await model.collection.createIndex(
                        { organizationId: 1 }
                    );

                    console.log(`✅ ${name}: Created organizationId index`);
                } catch (error) {
                    console.error(`⚠️  ${name}: ${error.message}`);
                    // Continue with other models
                }
            }

            console.log('\n✅ Multi-tenant migration complete');
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
            console.log('🔄 Rolling back organizationId from all models...');

            const models = [
                Purchase, Invoice, Item, Customer, Supplier, Bill,
                PaymentIn, PaymentOut, Return, PurchaseReturn,
                Expense, BankAccount, StockLedger
            ];

            for (const model of models) {
                const updateOptions = isReplicaSet ? { session } : {};
                await model.updateMany(
                    {},
                    { $unset: { organizationId: '' } },
                    updateOptions
                );

                // Drop index
                try {
                    await model.collection.dropIndex('organizationId_1');
                } catch (error) {
                    // Index might not exist
                }
            }

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

