import React from 'react';
import FormInput from '../FormInput';

const FinancialsTab = ({ formData, calculatedTotals, onInputChange }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
                {/* Item-Level Totals */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Item Totals</h3>
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Subtotal:</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{calculatedTotals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Item Discount:</span>
                            <span className="text-xs text-red-600 dark:text-red-400">- ₹{calculatedTotals.itemDiscount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Bill-Level Adjustments */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Bill-Level Adjustments</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <FormInput
                            label="Bill Discount"
                            type="number"
                            name="billDiscount"
                            value={formData.billDiscount}
                            onChange={onInputChange}
                            min="0"
                            step="0.01"
                        />
                        <FormInput
                            label="TDS Amount"
                            type="number"
                            name="tdsAmount"
                            value={formData.tdsAmount}
                            onChange={onInputChange}
                            min="0"
                            step="0.01"
                        />
                        <FormInput
                            label="Transport Charges"
                            type="number"
                            name="transportCharges"
                            value={formData.transportCharges}
                            onChange={onInputChange}
                            min="0"
                            step="0.01"
                        />
                        <FormInput
                            label="Handling Charges"
                            type="number"
                            name="handlingCharges"
                            value={formData.handlingCharges}
                            onChange={onInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="mt-2">
                        <FormInput
                            label="Restocking Fee"
                            type="number"
                            name="restockingFee"
                            value={formData.restockingFee}
                            onChange={onInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

                {/* Tax Breakdown */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Tax Breakdown</h3>
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">CGST:</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{calculatedTotals.totalCGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">SGST:</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{calculatedTotals.totalSGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">IGST:</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{calculatedTotals.totalIGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 dark:border-[rgb(var(--color-border))] pt-1.5 mt-1.5 text-xs">
                            <span className="text-gray-900 dark:text-[rgb(var(--color-text))] font-medium">Total Tax:</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{calculatedTotals.taxAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
                {/* Final Total */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border-2 border-indigo-200 dark:border-[rgb(var(--color-border))] p-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">Total Return Amount:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ₹{calculatedTotals.totalAmount.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-1.5">
                        This amount will be {formData.refundMode === 'adjust_payable' ? 'adjusted from supplier payable' :
                            formData.refundMode === 'cash' ? 'refunded in cash' :
                                formData.refundMode === 'bank_transfer' ? 'transferred to bank account' :
                                    'issued as credit note'}
                    </p>
                </div>

                {/* Calculation Breakdown */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                    <h4 className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Calculation Breakdown</h4>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>₹{calculatedTotals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Item Discount:</span>
                            <span className="text-red-600">- ₹{calculatedTotals.itemDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Bill Discount:</span>
                            <span className="text-red-600">- ₹{calculatedTotals.billDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tax Amount:</span>
                            <span>+ ₹{calculatedTotals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Transport Charges:</span>
                            <span>+ ₹{formData.transportCharges}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Handling Charges:</span>
                            <span>+ ₹{formData.handlingCharges}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Restocking Fee:</span>
                            <span>+ ₹{formData.restockingFee}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">TDS:</span>
                            <span className="text-red-600">- ₹{formData.tdsAmount}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 dark:border-[rgb(var(--color-border))] pt-1.5 mt-1.5 font-semibold text-xs">
                            <span>Total:</span>
                            <span>₹{calculatedTotals.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialsTab;
