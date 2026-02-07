import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import SupplierSelectionModal from '../../components/SupplierSelectionModal';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const PaymentOut = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        supplierId: null,
        totalAmount: '',
        paymentMethod: 'cash',
        bankAccount: '',
        reference: '',
        notes: '',
        chequeDetails: {
            chequeNumber: '',
            chequeDate: '',
            chequeBank: '',
        },
        allocatedBills: [],
        advanceAmount: '',
    });

    // UI state
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierInfo, setSupplierInfo] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashBalance, setCashBalance] = useState(0);
    const [hasBalanceData, setHasBalanceData] = useState(false);
    const [selectedBankBalance, setSelectedBankBalance] = useState(0);

    // Fetch bank accounts and cash balance on mount
    useEffect(() => {
        fetchBankAccounts();
        fetchCashBalance();
    }, []);

    // Fetch supplier info when supplier is selected
    useEffect(() => {
        if (selectedSupplier) {
            fetchSupplierInfo(selectedSupplier._id);
        }
    }, [selectedSupplier]);

    // Update bank balance when bank account changes
    useEffect(() => {
        if (formData.bankAccount) {
            const account = bankAccounts.find(acc => acc._id === formData.bankAccount);
            setSelectedBankBalance(account?.currentBalance || 0);
        }
    }, [formData.bankAccount, bankAccounts]);

    const fetchBankAccounts = async () => {
        try {
            const { data } = await api.get(`${API_URL}/api/cashbank/bank-accounts`);
            setBankAccounts(data);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const fetchCashBalance = async () => {
        try {
            const { data } = await api.get(`${API_URL}/api/cashbank/balance`);
            setCashBalance(data.balance || 0); // Fixed: backend returns 'balance', not 'cashBalance'
            setHasBalanceData(true);
        } catch (err) {
            console.error('Error fetching cash balance:', err);
            setHasBalanceData(false);
        }
    };

    const fetchSupplierInfo = async (supplierId) => {
        setLoading(true);
        try {
            const { data } = await api.get(`${API_URL}/api/payment-out/supplier/${supplierId}/info`);
            setSupplierInfo(data);

            // Initialize bill allocations
            const billAllocations = data.outstandingBills.map(bill => ({
                bill: bill._id,
                billNo: bill.billNo,
                billDate: bill.billDate,
                totalAmount: bill.totalAmount,
                paidAmount: bill.paidAmount,
                outstandingAmount: bill.outstandingAmount,
                allocatedAmount: '',
            }));

            setFormData(prev => ({
                ...prev,
                allocatedBills: billAllocations,
            }));
        } catch (err) {
            toast.error('Error fetching supplier information');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierSelect = (supplier) => {
        setSelectedSupplier(supplier);
        setFormData(prev => ({
            ...prev,
            supplierId: supplier._id,
        }));
        setShowSupplierModal(false);
    };

    const handleBillAllocationChange = (billId, amount) => {
        const allocatedAmount = amount === '' ? '' : parseFloat(amount) || 0;

        setFormData(prev => ({
            ...prev,
            allocatedBills: prev.allocatedBills.map(bill =>
                bill.bill === billId
                    ? { ...bill, allocatedAmount }
                    : bill
            ),
        }));
    };

    const calculateTotals = () => {
        const totalAllocatedToBills = formData.allocatedBills.reduce(
            (sum, bill) => sum + (parseFloat(bill.allocatedAmount) || 0),
            0
        );
        const totalAmount = parseFloat(formData.totalAmount) || 0;
        const advanceAmount = parseFloat(formData.advanceAmount) || 0;
        const unallocated = totalAmount - totalAllocatedToBills - advanceAmount;

        return {
            totalAllocatedToBills,
            advanceAmount,
            unallocated,
            totalAmount,
        };
    };

    const validateForm = () => {
        const { totalAmount, supplierId, paymentMethod, bankAccount, chequeDetails } = formData;
        const totals = calculateTotals();

        // Basic validations
        if (!supplierId) {
            toast.error('Please select a supplier');
            return false;
        }

        if (!totalAmount || parseFloat(totalAmount) <= 0) {
            toast.error('Please enter a valid payment amount');
            return false;
        }

        // Payment method specific validations
        if (['bank', 'upi', 'card', 'cheque'].includes(paymentMethod) && !bankAccount) {
            toast.error(`Please select a bank account for ${paymentMethod} payment`);
            return false;
        }

        if (paymentMethod === 'cheque') {
            if (!chequeDetails.chequeNumber || !chequeDetails.chequeDate) {
                toast.error('Please enter cheque number and date');
                return false;
            }
        }

        // Allocation validation
        if (totals.unallocated < 0) {
            toast.error(`Total allocation (₹${(totals.totalAllocatedToBills + totals.advanceAmount).toFixed(2)}) exceeds payment amount (₹${totals.totalAmount.toFixed(2)})`);
            return false;
        }

        // Bill allocation validation
        for (const bill of formData.allocatedBills) {
            if (bill.allocatedAmount > bill.outstandingAmount) {
                toast.error(`Allocated amount for bill ${bill.billNo} exceeds outstanding amount`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        try {
            // Prepare payload
            const payload = {
                paymentDate: formData.paymentDate,
                supplierId: formData.supplierId,
                totalAmount: parseFloat(formData.totalAmount),
                paymentMethod: formData.paymentMethod,
                reference: formData.reference,
                notes: formData.notes,
                allocatedBills: formData.allocatedBills
                    .filter(bill => bill.allocatedAmount > 0)
                    .map(bill => ({
                        bill: bill.bill,
                        allocatedAmount: bill.allocatedAmount,
                    })),
                advanceAmount: parseFloat(formData.advanceAmount) || 0,
            };

            // Add bank account for non-cash payments
            if (['bank', 'upi', 'card', 'cheque'].includes(formData.paymentMethod)) {
                payload.bankAccount = formData.bankAccount;
            }

            // Add cheque details if applicable
            if (formData.paymentMethod === 'cheque') {
                payload.chequeDetails = formData.chequeDetails;
            }

            const { data } = await api.post(`${API_URL}/api/payment-out`, payload);

            toast.success('Payment recorded successfully');
            navigate('/purchase/payment-out/list');
        } catch (err) {
            if (err.response?.data?.insufficientFunds) {
                const { available, requested, shortfall, paymentMethod, bankAccountName } = err.response.data;

                let message = `Insufficient ${paymentMethod === 'cash' ? 'cash' : 'bank'} balance!\n\n`;
                if (paymentMethod !== 'cash') {
                    message += `Account: ${bankAccountName}\n`;
                }
                message += `Available: ₹${available.toFixed(2)}\n`;
                message += `Requested: ₹${requested.toFixed(2)}\n`;
                message += `Shortfall: ₹${shortfall.toFixed(2)}\n\n`;
                message += `Suggestions:\n`;
                message += `• Pay partial amount of ₹${available.toFixed(2)}\n`;
                message += `• Change payment method\n`;
                message += `• Split payment across multiple methods`;

                toast.error(message, { autoClose: 8000 });
            } else {
                toast.error(err.response?.data?.message || 'Error recording payment');
            }
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAutoAllocate = () => {
        let remaining = parseFloat(formData.totalAmount) || 0;

        const updatedBills = formData.allocatedBills.map(bill => {
            if (remaining <= 0) return { ...bill, allocatedAmount: 0 };

            const toAllocate = Math.min(remaining, bill.outstandingAmount);
            remaining -= toAllocate;

            return { ...bill, allocatedAmount: toAllocate };
        });

        setFormData(prev => ({
            ...prev,
            allocatedBills: updatedBills,
            advanceAmount: remaining,
        }));
    };

    const totals = calculateTotals();
    const availableBalance = formData.paymentMethod === 'cash' ? cashBalance : selectedBankBalance;

    const paymentMethods = [
        { value: 'cash', label: 'Cash', icon: '💵' },
        { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
        { value: 'upi', label: 'UPI', icon: '📱' },
        { value: 'card', label: 'Card', icon: '💳' },
        { value: 'cheque', label: 'Cheque', icon: '📝' },
    ];

    return (
        <Layout>
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1">Payment Out</h1>
                        <p className="text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Record payments to suppliers</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/purchase/payment-out/list')}
                        className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        View Payment Out List
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Payment Details */}
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Payment Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormInput
                                    label="Payment Date"
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                    required
                                />
                                <FormInput
                                    label="Total Payment Amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.totalAmount}
                                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Supplier Selection */}
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Supplier</h2>
                            {selectedSupplier ? (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{selectedSupplier.businessName}</p>
                                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{selectedSupplier.contactPersonName} • {selectedSupplier.contactNo}</p>
                                            {supplierInfo && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-xs">
                                                        <span className="font-medium">Outstanding:</span> ₹{supplierInfo.outstandingBalance.toFixed(2)}
                                                    </p>
                                                    {supplierInfo.advanceBalance > 0 && (
                                                        <p className="text-xs text-green-600 dark:text-green-400">
                                                            <span className="font-medium">Advance Available:</span> ₹{supplierInfo.advanceBalance.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedSupplier(null);
                                                setSupplierInfo(null);
                                                setFormData(prev => ({ ...prev, supplierId: null, allocatedBills: [] }));
                                            }}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowSupplierModal(true)}
                                    className="w-full px-3 py-2 text-sm border-2 border-dashed border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
                                >
                                    Click to select supplier
                                </button>
                            )}
                        </div>

                        {/* Bill Allocation */}
                        {selectedSupplier && supplierInfo && supplierInfo.outstandingBills.length > 0 && (
                            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">Bill Allocation</h2>
                                    <button
                                        type="button"
                                        onClick={handleAutoAllocate}
                                        className="px-3 py-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                    >
                                        Auto Allocate
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bill No</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paid</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Allocate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-[rgb(var(--color-border))]">
                                            {formData.allocatedBills.map((bill) => (
                                                <tr key={bill.bill}>
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{bill.billNo}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                                                        {new Date(bill.billDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-right">₹{bill.totalAmount.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-xs text-right">₹{bill.paidAmount.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-xs text-right font-medium">₹{bill.outstandingAmount.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max={bill.outstandingAmount}
                                                            value={bill.allocatedAmount || ''}
                                                            onChange={(e) => handleBillAllocationChange(bill.bill, e.target.value)}
                                                            className="w-24 px-2 py-1 text-xs text-right border border-gray-300 dark:border-[rgb(var(--color-border))] rounded bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Advance Payment */}
                        {selectedSupplier && (
                            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                                <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Advance Payment</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormInput
                                        label="Advance Amount"
                                        type="number"
                                        step="0.01"
                                        value={formData.advanceAmount}
                                        onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                    {supplierInfo?.advanceBalance > 0 && (
                                        <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div>
                                                <p className="text-xs font-medium text-green-800 dark:text-green-300">Available Advance</p>
                                                <p className="text-sm font-bold text-green-600 dark:text-green-400">₹{supplierInfo.advanceBalance.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Method */}
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Payment Method</h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                                        className={`p-3 border-2 rounded-lg transition ${formData.paymentMethod === method.value
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                                            : 'border-gray-200 dark:border-[rgb(var(--color-border))] hover:border-indigo-300 dark:hover:border-indigo-500'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{method.icon}</div>
                                        <div className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{method.label}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Bank Account Selection */}
                            {['bank', 'upi', 'card', 'cheque'].includes(formData.paymentMethod) && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text))] mb-2">
                                            Select Bank Account *
                                        </label>
                                        <select
                                            value={formData.bankAccount}
                                            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                                            required
                                        >
                                            <option value="">Select bank account</option>
                                            {bankAccounts.map((account) => (
                                                <option key={account._id} value={account._id}>
                                                    {account.bankName} - ****{account.accountNumber.slice(-4)} (₹{account.currentBalance.toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <FormInput
                                        label="Reference / Transaction ID"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        placeholder="Enter reference number"
                                    />
                                </div>
                            )}

                            {/* Cheque Details */}
                            {formData.paymentMethod === 'cheque' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                    <FormInput
                                        label="Cheque Number *"
                                        value={formData.chequeDetails.chequeNumber}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            chequeDetails: { ...formData.chequeDetails, chequeNumber: e.target.value }
                                        })}
                                        required
                                    />
                                    <FormInput
                                        label="Cheque Date *"
                                        type="date"
                                        value={formData.chequeDetails.chequeDate}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            chequeDetails: { ...formData.chequeDetails, chequeDate: e.target.value }
                                        })}
                                        required
                                    />
                                    <FormInput
                                        label="Cheque Bank"
                                        value={formData.chequeDetails.chequeBank}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            chequeDetails: { ...formData.chequeDetails, chequeBank: e.target.value }
                                        })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Notes</h2>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                                placeholder="Add notes..."
                            />
                        </div>
                    </div>

                    {/* Sidebar - Payment Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 sticky top-4">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Payment Summary</h2>

                            {/* Balance Display */}
                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                                    {formData.paymentMethod === 'cash' ? 'Cash Balance' : 'Bank Balance'}
                                </p>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{availableBalance.toFixed(2)}</p>
                            </div>

                            {/* Summary */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total Payment</span>
                                    <span className="font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{totals.totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Allocated to Bills</span>
                                    <span className="font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">₹{totals.totalAllocatedToBills.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Advance Amount</span>
                                    <span className="font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">₹{totals.advanceAmount.toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-[rgb(var(--color-border))]">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Unallocated</span>
                                        <span className={`font-bold ${totals.unallocated < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            ₹{totals.unallocated.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Validation Messages */}
                            {totals.unallocated < 0 && (
                                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-xs text-red-800 dark:text-red-300">
                                        ⚠️ Total allocation exceeds payment amount
                                    </p>
                                </div>
                            )}

                            {hasBalanceData && totals.totalAmount > availableBalance && formData.paymentMethod !== 'cheque' && (
                                <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                        ⚠️ Payment amount exceeds available balance
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button
                                    type="submit"
                                    disabled={submitting || totals.unallocated < 0}
                                    className="w-full py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Saving...' : 'Save Payment'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/purchase/payment-out/list')}
                                    className="w-full py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] text-gray-700 dark:text-[rgb(var(--color-text-secondary))] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <SupplierSelectionModal
                isOpen={showSupplierModal}
                onClose={() => setShowSupplierModal(false)}
                onSelectSupplier={handleSupplierSelect}
            />
        </Layout>
    );
};

export default PaymentOut;
