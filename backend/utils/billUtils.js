import Bill from "../models/Bill.js";
import Counter from "../models/Counter.js";
import { info, error } from "./logger.js";

/**
 * Generate unique bill number: BILL-YYYYMMDD-XXX
 */
export const generateBillNo = async (userId) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BILL-${dateStr}`;

    // Find last bill number for today
    const lastBill = await Bill.findOne({
        billNo: new RegExp(`^${prefix}`),
        createdBy: userId
    }).sort({ billNo: -1 });

    let sequence = 1;
    if (lastBill && lastBill.billNo) {
        const parts = lastBill.billNo.split('-');
        if (parts.length >= 3) {
            const lastSequence = parseInt(parts[2]);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
    }

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
};

/**
 * Calculate bill aging
 */
export const calculateBillAging = (bill) => {
    if (!bill.dueDate) {
        return {
            daysOverdue: 0,
            agingBucket: 'Not Due',
            isOverdue: false
        };
    }

    const today = new Date();
    const due = new Date(bill.dueDate);

    if (today <= due) {
        const isDueToday = today.toDateString() === due.toDateString();
        return {
            daysOverdue: 0,
            agingBucket: isDueToday ? 'Due Today' : 'Not Due',
            isOverdue: false
        };
    }

    const diffTime = Math.abs(today - due);
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let agingBucket = 'Not Due';
    if (daysOverdue <= 30) {
        agingBucket = '1-30 Days';
    } else if (daysOverdue <= 60) {
        agingBucket = '31-60 Days';
    } else {
        agingBucket = '60+ Days';
    }

    return {
        daysOverdue,
        agingBucket,
        isOverdue: true
    };
};

/**
 * Calculate outstanding amount
 */
export const calculateOutstanding = (bill) => {
    const totalAmount = bill.totalAmount || 0;
    const paidAmount = bill.paidAmount || 0;
    const creditApplied = bill.totalCreditApplied || 0;
    return Math.max(0, totalAmount - paidAmount - creditApplied);
};

/**
 * Validate payment amount
 */
export const validatePayment = (bill, paymentAmount) => {
    const outstanding = calculateOutstanding(bill);

    if (paymentAmount <= 0) {
        return {
            valid: false,
            message: 'Payment amount must be greater than zero'
        };
    }

    if (paymentAmount > outstanding) {
        return {
            valid: false,
            message: `Payment amount exceeds outstanding balance. Outstanding: ₹${outstanding.toFixed(2)}`
        };
    }

    return {
        valid: true,
        outstanding
    };
};

/**
 * Create bill from purchase (auto-creation)
 */
export const createBillFromPurchase = async (purchase, userId) => {
    try {
        // Generate bill number
        const billNo = await generateBillNo(userId);

        // Use due date from purchase if provided, otherwise calculate default (30 days from invoice date)
        let dueDate;
        if (purchase.dueDate) {
            dueDate = new Date(purchase.dueDate);
        } else {
            dueDate = new Date(purchase.supplierInvoiceDate);
            dueDate.setDate(dueDate.getDate() + 30);
        }

        // Create bill data
        const billData = {
            billNo,
            billDate: purchase.purchaseDate,
            dueDate,
            supplier: purchase.supplier,
            supplierInvoiceNo: purchase.supplierInvoiceNo,
            supplierInvoiceDate: purchase.supplierInvoiceDate,
            purchase: purchase._id,
            purchaseNo: purchase.purchaseNo,
            items: purchase.items.map(item => ({
                item: item.item,
                itemName: item.itemName,
                quantity: item.quantity,
                purchaseRate: item.purchaseRate,
                taxRate: item.taxRate,
                discount: item.discount,
                hsnCode: item.hsnCode,
                taxableValue: item.taxableValue,
                cgst: item.cgst,
                sgst: item.sgst,
                igst: item.igst,
                total: item.total
            })),
            subtotal: purchase.subtotal,
            itemDiscount: purchase.itemDiscount,
            billDiscount: purchase.billDiscount,
            shippingCharges: purchase.shippingCharges,
            totalCGST: purchase.totalCGST,
            totalSGST: purchase.totalSGST,
            totalIGST: purchase.totalIGST,
            roundOff: purchase.roundOff,
            totalAmount: purchase.totalAmount,
            paidAmount: purchase.paidAmount || 0,
            outstandingAmount: purchase.outstandingAmount || purchase.totalAmount,
            paymentStatus: purchase.paymentStatus || 'unpaid',
            approvalStatus: 'approved', // Auto-approved for bills from purchases
            approvedBy: userId,
            approvedAt: new Date(),
            notes: purchase.notes || '',
            createdBy: userId,
            auditLog: [{
                action: 'created',
                performedBy: userId,
                performedAt: new Date(),
                details: `Bill auto-created from Purchase ${purchase.purchaseNo}`
            }]
        };

        // If purchase has payments, add to payment history
        if (purchase.paidAmount > 0) {
            billData.payments = [{
                paymentDate: purchase.purchaseDate,
                amount: purchase.paidAmount,
                paymentMethod: purchase.paymentMethod === 'bank' ? 'bank' : 'cash',
                bankAccount: purchase.bankAccount || null,
                reference: purchase.paymentReference || '',
                notes: `Initial payment from Purchase ${purchase.purchaseNo}`,
                recordedBy: userId
            }];
        }

        // Create the bill
        const bill = await Bill.create(billData);

        info(`Bill ${billNo} auto-created from Purchase ${purchase.purchaseNo}`);

        return bill;
    } catch (err) {
        error(`Failed to create bill from purchase: ${err.message}`);
        throw err;
    }
};

/**
 * Apply payment to bill
 */
export const applyPaymentToBill = async (bill, payment) => {
    try {
        // Validate payment
        const validation = validatePayment(bill, payment.amount);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        // Add payment to history
        bill.payments.push({
            paymentDate: payment.paymentDate || new Date(),
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            bankAccount: payment.bankAccount || null,
            reference: payment.reference || '',
            notes: payment.notes || '',
            recordedBy: payment.recordedBy,
            transactionId: payment.transactionId || null
        });

        // Update paid amount
        bill.paidAmount += payment.amount;

        // Add audit log
        bill.auditLog.push({
            action: 'payment_recorded',
            performedBy: payment.recordedBy,
            performedAt: new Date(),
            details: `Payment of ₹${payment.amount} recorded via ${payment.paymentMethod}`,
            changes: {
                amount: payment.amount,
                method: payment.paymentMethod,
                previousPaid: bill.paidAmount - payment.amount,
                newPaid: bill.paidAmount
            }
        });

        await bill.save();

        info(`Payment of ₹${payment.amount} applied to Bill ${bill.billNo}`);

        return bill;
    } catch (err) {
        error(`Failed to apply payment to bill: ${err.message}`);
        throw err;
    }
};

/**
 * Apply credit note to bill
 */
export const applyCreditNoteToBill = async (bill, creditNote, amount, userId) => {
    try {
        const outstanding = calculateOutstanding(bill);

        if (amount <= 0) {
            throw new Error('Credit amount must be greater than zero');
        }

        if (amount > outstanding) {
            throw new Error(`Credit amount exceeds outstanding balance. Outstanding: ₹${outstanding.toFixed(2)}`);
        }

        // Add credit note to applied list
        bill.creditNotesApplied.push({
            creditNoteId: creditNote._id,
            creditNoteNo: creditNote.returnId,
            appliedAmount: amount,
            appliedDate: new Date(),
            appliedBy: userId
        });

        // Update total credit applied
        bill.totalCreditApplied += amount;

        // Add audit log
        bill.auditLog.push({
            action: 'credit_applied',
            performedBy: userId,
            performedAt: new Date(),
            details: `Credit note ${creditNote.returnId} applied for ₹${amount}`,
            changes: {
                creditNoteId: creditNote._id,
                amount,
                previousCredit: bill.totalCreditApplied - amount,
                newCredit: bill.totalCreditApplied
            }
        });

        await bill.save();

        info(`Credit note ${creditNote.returnId} applied to Bill ${bill.billNo} for ₹${amount}`);

        return bill;
    } catch (err) {
        error(`Failed to apply credit note to bill: ${err.message}`);
        throw err;
    }
};

/**
 * Lock bill (prevent edits)
 */
export const lockBill = async (bill, userId) => {
    bill.isLocked = true;
    bill.auditLog.push({
        action: 'locked',
        performedBy: userId,
        performedAt: new Date(),
        details: 'Bill locked to prevent further edits'
    });
    await bill.save();
    info(`Bill ${bill.billNo} locked`);
    return bill;
};

/**
 * Unlock bill (admin only)
 */
export const unlockBill = async (bill, userId) => {
    bill.isLocked = false;
    bill.auditLog.push({
        action: 'unlocked',
        performedBy: userId,
        performedAt: new Date(),
        details: 'Bill unlocked for editing'
    });
    await bill.save();
    info(`Bill ${bill.billNo} unlocked`);
    return bill;
};
