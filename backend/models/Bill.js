import mongoose from "mongoose";

// Item schema for bill items
const billItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  purchaseRate: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  hsnCode: {
    type: String,
    default: "",
  },
  // Calculated fields
  taxableValue: {
    type: Number,
    required: true,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

// Payment history schema
const paymentHistorySchema = new mongoose.Schema({
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank', 'upi', 'card', 'cheque', 'credit_note', 'owner'],
    required: true,
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  reference: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CashbankTransaction",
  },
});

// Credit note application schema
const creditNoteSchema = new mongoose.Schema({
  creditNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PurchaseReturn",
    required: true,
  },
  creditNoteNo: {
    type: String,
    required: true,
  },
  appliedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  appliedDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// Audit log schema
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'payment_recorded', 'credit_applied', 'approved', 'rejected', 'cancelled', 'locked', 'unlocked'],
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  performedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  details: {
    type: String,
    default: "",
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
  },
});

// Main bill schema
const billSchema = new mongoose.Schema(
  {
    billNo: {
      type: String,
      required: true,
    },
    billDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },

    // Supplier information
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    // Supplier invoice details
    supplierInvoiceNo: {
      type: String,
      required: true,
    },
    supplierInvoiceDate: {
      type: Date,
      required: true,
    },

    // Purchase/PO linking
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
    },
    purchaseNo: {
      type: String,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder", // Note: Using SalesOrder as there's no PurchaseOrder model yet
    },
    poNo: {
      type: String,
    },

    // Items
    items: [billItemSchema],

    // Calculation fields
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    itemDiscount: {
      type: Number,
      default: 0,
    },
    billDiscount: {
      type: Number,
      default: 0,
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },

    // Tax breakup
    totalCGST: {
      type: Number,
      default: 0,
    },
    totalSGST: {
      type: Number,
      default: 0,
    },
    totalIGST: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue'],
      default: 'unpaid',
    },
    payments: [paymentHistorySchema],

    // Credit notes
    creditNotesApplied: [creditNoteSchema],
    totalCreditApplied: {
      type: Number,
      default: 0,
    },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'approved', // Default to approved for backward compatibility
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },

    // Attachments
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Notes
    notes: {
      type: String,
      default: "",
    },

    // Audit trail
    auditLog: [auditLogSchema],

    // Ownership
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Multi-tenancy
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field: Days overdue
billSchema.virtual('daysOverdue').get(function () {
  if (!this.dueDate) return 0;
  const today = new Date();
  const due = new Date(this.dueDate);
  if (today <= due) return 0;
  const diffTime = Math.abs(today - due);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual field: Aging bucket
billSchema.virtual('agingBucket').get(function () {
  if (!this.dueDate) return 'Not Due';
  const days = this.daysOverdue;
  if (days === 0) {
    const today = new Date();
    const due = new Date(this.dueDate);
    if (today.toDateString() === due.toDateString()) {
      return 'Due Today';
    }
    return 'Not Due';
  }
  if (days <= 30) return '1-30 Days';
  if (days <= 60) return '31-60 Days';
  return '60+ Days';
});

// Pre-save middleware: Calculate outstanding amount
billSchema.pre('save', function (next) {
  this.outstandingAmount = this.totalAmount - this.paidAmount - this.totalCreditApplied;

  // Update payment status based on outstanding
  if (this.outstandingAmount <= 0) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0 || this.totalCreditApplied > 0) {
    this.paymentStatus = 'partial';
  } else if (this.dueDate && new Date() > new Date(this.dueDate)) {
    this.paymentStatus = 'overdue';
  } else {
    this.paymentStatus = 'unpaid';
  }

  next();
});

// Indexes
billSchema.index({ billNo: 1, createdBy: 1 }, { unique: true });
billSchema.index({ supplier: 1, createdBy: 1 });
billSchema.index({ purchase: 1 });
billSchema.index({ paymentStatus: 1, createdBy: 1 });
billSchema.index({ approvalStatus: 1, createdBy: 1 });
billSchema.index({ dueDate: 1 });
billSchema.index({ billDate: -1 });

const Bill = mongoose.model("Bill", billSchema);
export default Bill;