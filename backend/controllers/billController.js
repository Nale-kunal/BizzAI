import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Purchase from "../models/Purchase.js";
import Supplier from "../models/Supplier.js";
import PurchaseReturn from "../models/PurchaseReturn.js";
import CashbankTransaction from "../models/CashbankTransaction.js";
import BankAccount from "../models/BankAccount.js";
import { error, info } from "../utils/logger.js";
import {
  generateBillNo,
  calculateBillAging,
  calculateOutstanding,
  validatePayment,
  applyPaymentToBill,
  applyCreditNoteToBill,
  lockBill,
  unlockBill
} from "../utils/billUtils.js";

/**
 * @desc Get all bills (with filters)
 * @route GET /api/bills
 */
export const getAllBills = async (req, res) => {
  try {
    const {
      status,
      supplier,
      startDate,
      endDate,
      approvalStatus,
      agingBucket
    } = req.query;

    const filter = { createdBy: req.user._id, isDeleted: false };

    if (status) {
      filter.paymentStatus = status;
    }

    if (supplier) {
      filter.supplier = supplier;
    }

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) filter.billDate.$gte = new Date(startDate);
      if (endDate) filter.billDate.$lte = new Date(endDate);
    }

    let bills = await Bill.find(filter)
      .populate("supplier", "businessName contactPersonName contactNo")
      .populate("purchase", "purchaseNo")
      .sort({ billDate: -1, createdAt: -1 });

    // Filter by aging bucket if specified
    if (agingBucket) {
      bills = bills.filter(bill => {
        const aging = calculateBillAging(bill);
        return aging.agingBucket === agingBucket;
      });
    }

    res.status(200).json(bills);
  } catch (err) {
    error(`Get all bills failed: ${err.message}`);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * @desc Get single bill by ID
 * @route GET /api/bills/:id
 */
export const getBillById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isDeleted: false
    })
      .populate("supplier")
      .populate("purchase")
      .populate("items.item", "name sku")
      .populate("payments.recordedBy", "name")
      .populate("payments.bankAccount", "bankName accountNumber")
      .populate("creditNotesApplied.creditNoteId")
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name")
      .populate("auditLog.performedBy", "name");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found or unauthorized" });
    }

    res.status(200).json(bill);
  } catch (err) {
    error(`Get bill by ID failed: ${err.message}`);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * @desc Create new bill (manual creation)
 * @route POST /api/bills
 */
export const createBill = async (req, res) => {
  try {
    const {
      billDate,
      dueDate,
      supplier,
      supplierInvoiceNo,
      supplierInvoiceDate,
      items,
      billDiscount = 0,
      shippingCharges = 0,
      notes
    } = req.body;

    // Validation
    if (!supplier || !supplierInvoiceNo || !supplierInvoiceDate) {
      return res.status(400).json({
        message: "Supplier, invoice number, and invoice date are required"
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required"
      });
    }

    // Validate supplier
    if (!mongoose.Types.ObjectId.isValid(supplier)) {
      return res.status(400).json({ message: "Invalid supplier ID format" });
    }

    const supplierDoc = await Supplier.findOne({
      _id: supplier,
      owner: req.user._id
    });

    if (!supplierDoc) {
      return res.status(404).json({ message: "Supplier not found or unauthorized" });
    }

    // Calculate totals (items should come with pre-calculated values from frontend)
    let subtotal = 0;
    let itemDiscount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const processedItems = items.map(item => {
      subtotal += item.taxableValue || 0;
      itemDiscount += item.discount || 0;
      totalCGST += item.cgst || 0;
      totalSGST += item.sgst || 0;
      totalIGST += item.igst || 0;
      return item;
    });

    const totalAmount = subtotal - billDiscount + shippingCharges + totalCGST + totalSGST + totalIGST;

    // Generate bill number
    const billNo = await generateBillNo(req.user._id);

    // Create bill
    const bill = await Bill.create({
      billNo,
      billDate: billDate || new Date(),
      dueDate: dueDate || null,
      supplier,
      supplierInvoiceNo,
      supplierInvoiceDate,
      items: processedItems,
      subtotal,
      itemDiscount,
      billDiscount,
      shippingCharges,
      totalCGST,
      totalSGST,
      totalIGST,
      totalAmount,
      paidAmount: 0,
      outstandingAmount: totalAmount,
      paymentStatus: 'unpaid',
      approvalStatus: 'draft', // Manual bills start as draft
      notes: notes || '',
      createdBy: req.user._id,
      auditLog: [{
        action: 'created',
        performedBy: req.user._id,
        performedAt: new Date(),
        details: 'Bill created manually'
      }]
    });

    // Update supplier outstanding
    supplierDoc.outstandingBalance += totalAmount;
    await supplierDoc.save();

    const populatedBill = await Bill.findById(bill._id)
      .populate("supplier", "businessName");

    res.status(201).json({
      message: "Bill created successfully",
      bill: populatedBill
    });
  } catch (err) {
    error(`Create bill failed: ${err.message}`);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * @desc Update bill
 * @route PUT /api/bills/:id
 */
export const updateBill = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found or unauthorized" });
    }

    // Check if bill is locked
    if (bill.isLocked) {
      return res.status(400).json({
        message: "Bill is locked and cannot be edited"
      });
    }

    // Check if bill is approved
    if (bill.approvalStatus === 'approved') {
      return res.status(400).json({
        message: "Approved bills cannot be edited. Please unlock first."
      });
    }

    const {
      billDate,
      dueDate,
      supplierInvoiceNo,
      supplierInvoiceDate,
      items,
      billDiscount,
      shippingCharges,
      notes
    } = req.body;

    // Recalculate if items changed
    if (items) {
      let subtotal = 0;
      let itemDiscount = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      items.forEach(item => {
        subtotal += item.taxableValue || 0;
        itemDiscount += item.discount || 0;
        totalCGST += item.cgst || 0;
        totalSGST += item.sgst || 0;
        totalIGST += item.igst || 0;
      });

      bill.items = items;
      bill.subtotal = subtotal;
      bill.itemDiscount = itemDiscount;
      bill.totalCGST = totalCGST;
      bill.totalSGST = totalSGST;
      bill.totalIGST = totalIGST;
      bill.totalAmount = subtotal - (billDiscount || 0) + (shippingCharges || 0) + totalCGST + totalSGST + totalIGST;
    }

    // Update other fields
    if (billDate) bill.billDate = billDate;
    if (dueDate !== undefined) bill.dueDate = dueDate;
    if (supplierInvoiceNo) bill.supplierInvoiceNo = supplierInvoiceNo;
    if (supplierInvoiceDate) bill.supplierInvoiceDate = supplierInvoiceDate;
    if (billDiscount !== undefined) bill.billDiscount = billDiscount;
    if (shippingCharges !== undefined) bill.shippingCharges = shippingCharges;
    if (notes !== undefined) bill.notes = notes;

    // Add audit log
    bill.auditLog.push({
      action: 'updated',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: 'Bill updated',
      changes: req.body
    });

    await bill.save();

    const updatedBill = await Bill.findById(bill._id)
      .populate("supplier", "businessName");

    res.status(200).json({
      message: "Bill updated successfully",
      bill: updatedBill
    });
  } catch (err) {
    error(`Update bill failed: ${err.message}`);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * @desc Delete bill (soft delete with reversal)
 * @route DELETE /api/bills/:id
 */
export const deleteBill = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found or unauthorized" });
    }

    // Check if bill has payments
    if (bill.paidAmount > 0 || bill.totalCreditApplied > 0) {
      return res.status(400).json({
        message: "Cannot delete bill with payments or credit notes applied. Please reverse payments first."
      });
    }

    // Update supplier outstanding
    const supplier = await Supplier.findById(bill.supplier);
    if (supplier) {
      supplier.outstandingBalance -= bill.outstandingAmount;
      await supplier.save();
    }

    // Soft delete
    bill.isDeleted = true;
    bill.deletedAt = new Date();
    bill.deletedBy = req.user._id;
    bill.auditLog.push({
      action: 'cancelled',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: 'Bill deleted/cancelled'
    });

    await bill.save();

    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (err) {
    error(`Delete bill failed: ${err.message}`);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/**
 * @desc Record payment on bill
 * @route POST /api/bills/:id/payment
 */
export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, amount, paymentMethod, bankAccount, reference, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Check if bill is approved
    if (bill.approvalStatus !== 'approved') {
      return res.status(400).json({
        message: "Bill must be approved before recording payment"
      });
    }

    const paymentAmount = Number(amount);

    // Validate payment
    const validation = validatePayment(bill, paymentAmount);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Validate cash balance for cash payments
    if (paymentMethod === 'cash') {
      const cashBalance = await CashbankTransaction.getCashBalance(req.user._id);

      if (paymentAmount > cashBalance) {
        return res.status(400).json({
          insufficientFunds: true,
          paymentMethod: 'cash',
          available: cashBalance,
          requested: paymentAmount,
          shortfall: paymentAmount - cashBalance,
          message: `Insufficient cash balance. Available: ₹${cashBalance.toFixed(2)}, Required: ₹${paymentAmount.toFixed(2)}, Shortfall: ₹${(paymentAmount - cashBalance).toFixed(2)}`
        });
      }
    }

    // Handle bank payment
    let transactionId = null;
    const bankMethods = ['bank', 'upi', 'card', 'cheque'];

    if (bankMethods.includes(paymentMethod) && bankAccount) {
      const bankAcc = await BankAccount.findOne({
        _id: bankAccount,
        userId: req.user._id
      });

      if (!bankAcc) {
        return res.status(400).json({ message: 'Bank account not found' });
      }

      if (bankAcc.currentBalance < paymentAmount) {
        return res.status(400).json({
          insufficientFunds: true,
          paymentMethod: paymentMethod,
          bankAccountName: `${bankAcc.bankName} - ****${bankAcc.accountNumber.slice(-4)}`,
          available: bankAcc.currentBalance,
          requested: paymentAmount,
          shortfall: paymentAmount - bankAcc.currentBalance,
          message: `Insufficient bank balance. Available: ₹${bankAcc.currentBalance.toFixed(2)}, Required: ₹${paymentAmount.toFixed(2)}, Shortfall: ₹${(paymentAmount - bankAcc.currentBalance).toFixed(2)}`
        });
      }

      // Create cashbank transaction (money OUT)
      const cashbankTxn = await CashbankTransaction.create({
        type: 'out',
        amount: paymentAmount,
        fromAccount: bankAccount,
        toAccount: 'purchase',
        description: `Payment for bill ${bill.billNo} via ${paymentMethod.toUpperCase()}`,
        date: paymentDate || new Date(),
        userId: req.user._id
      });

      // Update bank balance
      await BankAccount.updateOne(
        { _id: bankAccount, userId: req.user._id },
        {
          $inc: { currentBalance: -paymentAmount },
          $push: { transactions: cashbankTxn._id }
        }
      );

      transactionId = cashbankTxn._id;
      info(`${paymentMethod.toUpperCase()} payment for bill ${bill.billNo}: -₹${paymentAmount}`);
    } else if (paymentMethod === 'cash') {
      // Record cash payment transaction
      const cashbankTxn = await CashbankTransaction.create({
        type: 'out',
        amount: paymentAmount,
        fromAccount: 'cash',
        toAccount: 'purchase',
        description: `Cash payment for bill ${bill.billNo}`,
        date: paymentDate || new Date(),
        userId: req.user._id
      });

      transactionId = cashbankTxn._id;
      info(`Cash payment for bill ${bill.billNo}: -₹${paymentAmount}`);
    } else if (paymentMethod === 'owner') {
      // Owner's personal payment - no balance validation needed
      // This represents owner's capital contribution to pay business expenses
      const cashbankTxn = await CashbankTransaction.create({
        type: 'in',
        amount: paymentAmount,
        fromAccount: 'owner-capital',
        toAccount: 'purchase',
        description: `Owner's personal payment for bill ${bill.billNo}`,
        date: paymentDate || new Date(),
        userId: req.user._id
      });

      transactionId = cashbankTxn._id;
      info(`Owner's personal payment for bill ${bill.billNo}: ₹${paymentAmount}`);
    } else {
      // If payment method is not recognized or bank account is missing for bank methods
      return res.status(400).json({
        message: 'Invalid payment method or missing bank account for bank-related payment'
      });
    }

    // Apply payment to bill
    const payment = {
      paymentDate: paymentDate || new Date(),
      amount: paymentAmount,
      paymentMethod,
      bankAccount: bankAccount || null,
      reference: reference || '',
      notes: notes || '',
      recordedBy: req.user._id,
      transactionId
    };

    await applyPaymentToBill(bill, payment);

    // Update supplier outstanding
    const supplier = await Supplier.findById(bill.supplier);
    if (supplier) {
      supplier.outstandingBalance -= paymentAmount;
      await supplier.save();
    }

    await bill.populate("supplier", "businessName");

    res.status(200).json({
      message: 'Payment recorded successfully',
      bill
    });
  } catch (err) {
    error(`Record payment failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Apply credit note to bill
 * @route POST /api/bills/:id/apply-credit
 */
export const applyCreditNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { creditNoteId, amount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(creditNoteId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const bill = await Bill.findOne({
      _id: id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const creditNote = await PurchaseReturn.findOne({
      _id: creditNoteId,
      createdBy: req.user._id
    });

    if (!creditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }

    // Verify credit note is for same supplier
    if (creditNote.supplier.toString() !== bill.supplier.toString()) {
      return res.status(400).json({
        message: "Credit note must be from the same supplier"
      });
    }

    const creditAmount = Number(amount);

    await applyCreditNoteToBill(bill, creditNote, creditAmount, req.user._id);

    // Update supplier outstanding
    const supplier = await Supplier.findById(bill.supplier);
    if (supplier) {
      supplier.outstandingBalance -= creditAmount;
      await supplier.save();
    }

    await bill.populate("supplier", "businessName");

    res.status(200).json({
      message: 'Credit note applied successfully',
      bill
    });
  } catch (err) {
    error(`Apply credit note failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Get bill aging analysis
 * @route GET /api/bills/aging
 */
export const getBillAging = async (req, res) => {
  try {
    const bills = await Bill.find({
      createdBy: req.user._id,
      isDeleted: false,
      paymentStatus: { $ne: 'paid' }
    })
      .populate("supplier", "businessName")
      .sort({ dueDate: 1 });

    const agingData = {
      notDue: { count: 0, amount: 0, bills: [] },
      dueToday: { count: 0, amount: 0, bills: [] },
      '1-30Days': { count: 0, amount: 0, bills: [] },
      '31-60Days': { count: 0, amount: 0, bills: [] },
      '60PlusDays': { count: 0, amount: 0, bills: [] }
    };

    bills.forEach(bill => {
      const aging = calculateBillAging(bill);
      const outstanding = calculateOutstanding(bill);
      const billData = {
        _id: bill._id,
        billNo: bill.billNo,
        supplier: bill.supplier,
        dueDate: bill.dueDate,
        totalAmount: bill.totalAmount,
        outstanding,
        daysOverdue: aging.daysOverdue
      };

      switch (aging.agingBucket) {
        case 'Not Due':
          agingData.notDue.count++;
          agingData.notDue.amount += outstanding;
          agingData.notDue.bills.push(billData);
          break;
        case 'Due Today':
          agingData.dueToday.count++;
          agingData.dueToday.amount += outstanding;
          agingData.dueToday.bills.push(billData);
          break;
        case '1-30 Days':
          agingData['1-30Days'].count++;
          agingData['1-30Days'].amount += outstanding;
          agingData['1-30Days'].bills.push(billData);
          break;
        case '31-60 Days':
          agingData['31-60Days'].count++;
          agingData['31-60Days'].amount += outstanding;
          agingData['31-60Days'].bills.push(billData);
          break;
        case '60+ Days':
          agingData['60PlusDays'].count++;
          agingData['60PlusDays'].amount += outstanding;
          agingData['60PlusDays'].bills.push(billData);
          break;
      }
    });

    res.status(200).json(agingData);
  } catch (err) {
    error(`Get bill aging failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Get bill analytics/KPIs
 * @route GET /api/bills/analytics
 */
export const getBillAnalytics = async (req, res) => {
  try {
    const bills = await Bill.find({
      createdBy: req.user._id,
      isDeleted: false
    });

    const analytics = {
      totalBills: bills.length,
      totalBillAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalOverdue: 0,
      unpaidCount: 0,
      partialCount: 0,
      paidCount: 0,
      overdueCount: 0
    };

    bills.forEach(bill => {
      analytics.totalBillAmount += bill.totalAmount;
      analytics.totalPaid += bill.paidAmount + bill.totalCreditApplied;

      const outstanding = calculateOutstanding(bill);
      analytics.totalOutstanding += outstanding;

      if (bill.paymentStatus === 'unpaid') analytics.unpaidCount++;
      if (bill.paymentStatus === 'partial') analytics.partialCount++;
      if (bill.paymentStatus === 'paid') analytics.paidCount++;

      const aging = calculateBillAging(bill);
      if (aging.isOverdue && outstanding > 0) {
        analytics.overdueCount++;
        analytics.totalOverdue += outstanding;
      }
    });

    res.status(200).json(analytics);
  } catch (err) {
    error(`Get bill analytics failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Approve bill
 * @route POST /api/bills/:id/approve
 */
export const approveBill = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.approvalStatus === 'approved') {
      return res.status(400).json({ message: "Bill is already approved" });
    }

    bill.approvalStatus = 'approved';
    bill.approvedBy = req.user._id;
    bill.approvedAt = new Date();
    bill.auditLog.push({
      action: 'approved',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: 'Bill approved for payment'
    });

    await bill.save();

    res.status(200).json({
      message: 'Bill approved successfully',
      bill
    });
  } catch (err) {
    error(`Approve bill failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Reject bill
 * @route POST /api/bills/:id/reject
 */
export const rejectBill = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID format" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isDeleted: false
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    bill.approvalStatus = 'rejected';
    bill.rejectedBy = req.user._id;
    bill.rejectedAt = new Date();
    bill.rejectionReason = reason || '';
    bill.auditLog.push({
      action: 'rejected',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: `Bill rejected: ${reason || 'No reason provided'}`
    });

    await bill.save();

    res.status(200).json({
      message: 'Bill rejected',
      bill
    });
  } catch (err) {
    error(`Reject bill failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Get bills by supplier
 * @route GET /api/bills/supplier/:supplierId
 */
export const getBillsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid supplier ID format" });
    }

    const bills = await Bill.find({
      supplier: supplierId,
      createdBy: req.user._id,
      isDeleted: false
    })
      .populate("purchase", "purchaseNo")
      .sort({ billDate: -1 });

    res.status(200).json(bills);
  } catch (err) {
    error(`Get bills by supplier failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Get overdue bills
 * @route GET /api/bills/overdue
 */
export const getOverdueBills = async (req, res) => {
  try {
    const bills = await Bill.find({
      createdBy: req.user._id,
      isDeleted: false,
      dueDate: { $lt: new Date() },
      paymentStatus: { $ne: 'paid' }
    })
      .populate("supplier", "businessName contactPersonName contactNo")
      .populate("purchase", "purchaseNo")
      .sort({ dueDate: 1 });

    const overdueData = bills.map(bill => {
      const aging = calculateBillAging(bill);
      const outstanding = calculateOutstanding(bill);
      return {
        ...bill.toObject(),
        daysOverdue: aging.daysOverdue,
        agingBucket: aging.agingBucket,
        outstanding
      };
    });

    res.status(200).json(overdueData);
  } catch (err) {
    error(`Get overdue bills failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc Bulk payment processing
 * @route POST /api/bills/bulk-payment
 */
export const bulkPayment = async (req, res) => {
  try {
    const { billIds, paymentMethod, bankAccount, paymentDate, reference } = req.body;

    if (!billIds || billIds.length === 0) {
      return res.status(400).json({ message: "No bills selected" });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const billId of billIds) {
      try {
        const bill = await Bill.findOne({
          _id: billId,
          createdBy: req.user._id,
          isDeleted: false
        });

        if (!bill) {
          results.failed.push({ billId, reason: "Bill not found" });
          continue;
        }

        if (bill.approvalStatus !== 'approved') {
          results.failed.push({ billId, billNo: bill.billNo, reason: "Bill not approved" });
          continue;
        }

        const outstanding = calculateOutstanding(bill);
        if (outstanding <= 0) {
          results.failed.push({ billId, billNo: bill.billNo, reason: "No outstanding amount" });
          continue;
        }

        // Record payment for full outstanding amount
        const payment = {
          paymentDate: paymentDate || new Date(),
          amount: outstanding,
          paymentMethod,
          bankAccount: bankAccount || null,
          reference: reference || '',
          notes: 'Bulk payment',
          recordedBy: req.user._id
        };

        await applyPaymentToBill(bill, payment);

        // Update supplier outstanding
        const supplier = await Supplier.findById(bill.supplier);
        if (supplier) {
          supplier.outstandingBalance -= outstanding;
          await supplier.save();
        }

        results.successful.push({ billId, billNo: bill.billNo, amount: outstanding });
      } catch (err) {
        results.failed.push({ billId, reason: err.message });
      }
    }

    res.status(200).json({
      message: `Bulk payment completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });
  } catch (err) {
    error(`Bulk payment failed: ${err.message}`);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};