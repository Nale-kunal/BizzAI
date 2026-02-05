/**
 * GST Calculator Utilities
 * 
 * Provides functions for calculating GST on purchases and sales
 */

/**
 * Extract state code from GSTIN
 * @param {String} gstin - 15-character GSTIN
 * @returns {String} 2-digit state code
 */
export const extractStateFromGSTIN = (gstin) => {
    if (!gstin || gstin.length < 2) {
        return null;
    }
    return gstin.substring(0, 2);
};

/**
 * Check if purchase is inter-state
 * @param {String} supplierGSTIN - Supplier's GSTIN
 * @param {String} buyerGSTIN - Buyer's GSTIN
 * @returns {Boolean} True if inter-state
 */
export const isInterStatePurchase = (supplierGSTIN, buyerGSTIN) => {
    const supplierState = extractStateFromGSTIN(supplierGSTIN);
    const buyerState = extractStateFromGSTIN(buyerGSTIN);

    if (!supplierState || !buyerState) {
        return false;
    }

    return supplierState !== buyerState;
};

/**
 * Calculate GST breakdown
 * @param {Number} taxableValue - Amount on which GST is calculated
 * @param {Number} taxRate - GST rate percentage
 * @param {Boolean} isIntraState - True for CGST+SGST, False for IGST
 * @param {Number} discount - Discount amount (optional, for backward compatibility)
 * @returns {Object} GST breakdown with cgst, sgst, igst, totalTax, total
 */
export const calculateGST = (taxableValue, taxRate, isIntraState = true, discount = 0) => {
    // If discount is provided, subtract it from taxable value
    const finalTaxableValue = discount > 0 ? taxableValue - discount : taxableValue;

    const totalTax = (finalTaxableValue * taxRate) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
        // Intra-state: CGST + SGST (split equally)
        cgst = totalTax / 2;
        sgst = totalTax / 2;
    } else {
        // Inter-state: IGST
        igst = totalTax;
    }

    return {
        taxableValue: parseFloat(finalTaxableValue.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        igst: parseFloat(igst.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        total: parseFloat((finalTaxableValue + totalTax).toFixed(2))
    };
};

/**
 * Calculate purchase item totals with GST
 * @param {Number} quantity - Item quantity
 * @param {Number} rate - Purchase rate per unit
 * @param {Number} discount - Discount amount
 * @param {Number} taxRate - Tax rate percentage
 * @param {Boolean} isInterState - Whether it's inter-state
 * @returns {Object} Complete calculation breakdown
 */
export const calculatePurchaseItemTotal = (
    quantity,
    rate,
    discount = 0,
    taxRate = 0,
    isInterState = false
) => {
    const baseAmount = quantity * rate;
    const taxableValue = baseAmount - discount;
    const gst = calculateGST(taxableValue, taxRate, !isInterState);

    return {
        baseAmount: parseFloat(baseAmount.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        totalTax: gst.totalTax,
        total: gst.total,
    };
};

/**
 * Calculate item total (alias for calculatePurchaseItemTotal with object parameter)
 * @param {Object} item - Item object with quantity, purchaseRate/rate, taxRate, discount
 * @param {Boolean} isIntraState - Whether it's intra-state (true = CGST+SGST, false = IGST)
 * @returns {Object} Complete calculation breakdown
 */
export const calculateItemTotal = (item, isIntraState = true) => {
    const rate = item.purchaseRate || item.rate || 0;
    return calculatePurchaseItemTotal(
        item.quantity,
        rate,
        item.discount || 0,
        item.taxRate || 0,
        !isIntraState  // Convert: isIntraState=true means isInterState=false
    );
};


/**
 * Calculate round off amount
 * @param {Number} amount - Amount to round
 * @returns {Object} { roundedAmount, roundOff }
 */
export const calculateRoundOff = (amount) => {
    const rounded = Math.round(amount);
    const roundOff = rounded - amount;

    return {
        roundedAmount: rounded,
        roundOff: parseFloat(roundOff.toFixed(2))
    };
};

// State code mapping
const STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh (New)",
    "38": "Ladakh",
};

/**
 * Get state name from code
 * @param {String} stateCode - 2-digit state code
 * @returns {String} State name
 */
export const getStateName = (stateCode) => {
    return STATE_CODES[stateCode] || "Unknown";
};

/**
 * Calculate bill total from multiple items
 * @param {Array} items - Array of items with calculated totals (cgst, sgst, igst, total)
 * @param {Number} billDiscount - Bill-level discount
 * @param {Number} shippingCharges - Shipping charges to add
 * @returns {Object} Complete bill calculation
 */
export const calculateBillTotal = (items, billDiscount = 0, shippingCharges = 0) => {
    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    items.forEach(item => {
        const baseAmount = (item.quantity || 0) * (item.purchaseRate || item.rate || 0);
        subtotal += baseAmount;
        totalCGST += item.cgst || 0;
        totalSGST += item.sgst || 0;
        totalIGST += item.igst || 0;
    });

    const totalTax = totalCGST + totalSGST + totalIGST;
    const totalAmount = subtotal + totalTax - billDiscount + shippingCharges;

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalCGST: parseFloat(totalCGST.toFixed(2)),
        totalSGST: parseFloat(totalSGST.toFixed(2)),
        totalIGST: parseFloat(totalIGST.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        billDiscount: parseFloat(billDiscount.toFixed(2)),
        shippingCharges: parseFloat(shippingCharges.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2))
    };
};
