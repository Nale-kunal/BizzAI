import StockLedger from '../models/StockLedger.js';
import StockMovement from '../models/StockMovement.js';
import Purchase from '../models/Purchase.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import mongoose from 'mongoose';

/**
 * Migration: Backfill StockLedger from existing data
 * 
 * This migration reconstructs the stock ledger from:
 * - StockMovement records
 * - Purchase records
 * - Invoice records
 */

async function up() {
  console.log('🔄 Starting StockLedger backfill migration...\n');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get all items
    const items = await Item.find({ isDeleted: { $ne: true } }).session(session);
    console.log(`📦 Found ${items.length} items to process\n`);

    let totalEntriesCreated = 0;
    let itemsProcessed = 0;

    for (const item of items) {
      console.log(`Processing: ${item.name} (${item.sku || 'no-sku'})`);

      // Check if ledger already exists for this item
      const existingEntries = await StockLedger.countDocuments({ 
        item: item._id 
      }).session(session);

      if (existingEntries > 0) {
        console.log(`  ⚠️  Ledger already exists (${existingEntries} entries), skipping`);
        continue;
      }

      // Get all stock movements for this item, sorted by timestamp
      const movements = await StockMovement
        .find({ item: item._id })
        .sort({ createdAt: 1 })
        .session(session);

      if (movements.length === 0) {
        // No movements, create initial stock entry if stockQty > 0
        if (item.stockQty > 0) {
          await StockLedger.create([{
            item: item._id,
            transactionType: 'INITIAL_STOCK',
            sourceDocument: {
              type: 'Adjustment',
              id: item._id
            },
            quantityChange: item.stockQty,
            runningBalance: item.stockQty,
            costPerUnit: item.costPrice || 0,
            totalValue: (item.costPrice || 0) * item.stockQty,
            createdBy: item.addedBy,
            timestamp: item.createdAt,
            metadata: {
              notes: 'Initial stock from migration'
            }
          }], { session });

          totalEntriesCreated++;
          console.log(`  ✅ Created initial stock entry: ${item.stockQty} units`);
        }
      } else {
        // Process movements
        let runningBalance = 0;

        for (const movement of movements) {
          // Map movement type to ledger transaction type
          const transactionType = mapMovementTypeToLedgerType(movement.type);
          
          if (!transactionType) {
            console.log(`  ⚠️  Unknown movement type: ${movement.type}, skipping`);
            continue;
          }

          // Calculate quantity change
          const quantityChange = movement.quantity * (isInflow(movement.type) ? 1 : -1);
          runningBalance += quantityChange;

          // Ensure running balance doesn't go negative
          if (runningBalance < 0) {
            console.log(`  ⚠️  Negative balance detected, adjusting to 0`);
            runningBalance = 0;
          }

          // Create ledger entry
          await StockLedger.create([{
            item: item._id,
            transactionType,
            sourceDocument: {
              type: movement.source?.type || 'Adjustment',
              id: movement.source?.id || movement._id
            },
            quantityChange,
            runningBalance,
            costPerUnit: movement.costPerUnit || item.costPrice || 0,
            totalValue: (movement.costPerUnit || item.costPrice || 0) * Math.abs(quantityChange),
            createdBy: movement.createdBy || item.addedBy,
            timestamp: movement.createdAt,
            metadata: {
              originalMovementId: movement._id,
              notes: movement.notes
            }
          }], { session });

          totalEntriesCreated++;
        }

        console.log(`  ✅ Created ${movements.length} ledger entries, final balance: ${runningBalance}`);

        // Reconcile with current stockQty
        if (Math.abs(runningBalance - item.stockQty) > 0.01) {
          console.log(`  ⚠️  Discrepancy detected! Ledger: ${runningBalance}, Item: ${item.stockQty}`);
          
          // Create adjustment entry to match
          const adjustment = item.stockQty - runningBalance;
          await StockLedger.create([{
            item: item._id,
            transactionType: adjustment > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            sourceDocument: {
              type: 'Adjustment',
              id: item._id
            },
            quantityChange: adjustment,
            runningBalance: item.stockQty,
            costPerUnit: item.costPrice || 0,
            totalValue: (item.costPrice || 0) * Math.abs(adjustment),
            createdBy: item.addedBy,
            timestamp: new Date(),
            metadata: {
              notes: 'Reconciliation adjustment from migration'
            }
          }], { session });

          totalEntriesCreated++;
          console.log(`  ✅ Created reconciliation adjustment: ${adjustment}`);
        }
      }

      itemsProcessed++;
    }

    await session.commitTransaction();

    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Items processed: ${itemsProcessed}`);
    console.log(`   - Ledger entries created: ${totalEntriesCreated}`);

  } catch (error) {
    await session.abortTransaction();
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Rollback migration
 */
async function down() {
  console.log('🔄 Rolling back StockLedger migration...\n');

  const result = await StockLedger.deleteMany({
    'metadata.notes': { 
      $in: ['Initial stock from migration', 'Reconciliation adjustment from migration']
    }
  });

  console.log(`✅ Deleted ${result.deletedCount} migration entries`);
}

/**
 * Map StockMovement type to StockLedger transaction type
 */
function mapMovementTypeToLedgerType(movementType) {
  const mapping = {
    'PURCHASE': 'PURCHASE',
    'SALE': 'SALE',
    'POS_SALE': 'SALE',
    'INVOICE': 'SALE',
    'RETURN': 'SALES_RETURN',
    'PURCHASE_RETURN': 'PURCHASE_RETURN',
    'PURCHASE_RETURN_APPROVED': 'PURCHASE_RETURN',
    'ADJUSTMENT_IN': 'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT': 'ADJUSTMENT_OUT',
    'DAMAGE': 'DAMAGE',
    'IN_TRANSIT': 'TRANSFER_OUT',
    'DELIVER': 'TRANSFER_IN'
  };

  return mapping[movementType] || null;
}

/**
 * Check if movement type is an inflow
 */
function isInflow(movementType) {
  const inflowTypes = [
    'PURCHASE',
    'RETURN',
    'ADJUSTMENT_IN',
    'DELIVER',
    'SALES_RETURN',
    'PURCHASE_RETURN_APPROVED'
  ];

  return inflowTypes.includes(movementType);
}

export { up, down };
export default up;
