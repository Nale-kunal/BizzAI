import mongoose from "mongoose";

const cashbankTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["transfer", "in", "out"],
      required: [true, "Please specify transaction type"],
    },
    amount: {
      type: Number,
      required: [true, "Please enter amount"],
      min: [0.01, "Amount must be positive"],
    },
    fromAccount: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or 'cash'
      required: [true, "Please specify source account"],
    },
    toAccount: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or 'cash'
      required: [true, "Please specify destination account"],
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledDate: {
      type: Date,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reference: {
      type: String, // Check number, reference ID, etc.
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Validation to ensure from and to are not the same
cashbankTransactionSchema.pre("validate", function (next) {
  if (this.fromAccount === this.toAccount) {
    return next(new Error("Source and destination accounts cannot be the same"));
  }
  next();
});

/**
 * Get current cash balance for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>} Current cash balance
 */
cashbankTransactionSchema.statics.getCashBalance = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { fromAccount: 'cash' },
          { toAccount: 'cash' }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalIn: {
          $sum: {
            $cond: [
              { $eq: ['$toAccount', 'cash'] },
              '$amount',
              0
            ]
          }
        },
        totalOut: {
          $sum: {
            $cond: [
              { $eq: ['$fromAccount', 'cash'] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);

  if (!result || result.length === 0) {
    return 0;
  }

  const balance = result[0].totalIn - result[0].totalOut;
  return balance;
};

const CashbankTransaction = mongoose.model("CashbankTransaction", cashbankTransactionSchema);
export default CashbankTransaction;