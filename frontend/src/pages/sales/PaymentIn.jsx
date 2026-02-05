import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../services/api';
import { toast } from "react-toastify";
import Layout from "../../components/Layout";
import FormInput from "../../components/FormInput";
import CustomerSelectionModal from "../../components/CustomerSelectionModal";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const PaymentIn = () => {
  const navigate = useNavigate();

  // Get token from user object in localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [formData, setFormData] = useState({
    receiptNo: "RCP-" + Date.now(),
    receiptDate: new Date().toISOString().split("T")[0],
    customer: null,
    paymentMethods: [
      {
        method: "cash",
        amount: 0,
        reference: "",
        bankAccount: "",
        cardType: "",
        chequeNumber: "",
        chequeDate: "",
        chequeBank: "",
      },
    ],
    depositAccount: "cash",
    notes: "",
  });

  const [customerInfo, setCustomerInfo] = useState({
    outstandingDue: 0,
    availableCredit: 0,
    outstandingInvoices: [],
  });

  const [invoiceAllocations, setInvoiceAllocations] = useState({});
  const [creditApplied, setCreditApplied] = useState(0);

  const paymentMethodOptions = [
    { value: "cash", label: "Cash", icon: "💵" },
    { value: "upi", label: "UPI", icon: "📱" },
    { value: "card", label: "Card", icon: "💳" },
    { value: "cheque", label: "Cheque", icon: "🏦" },
    { value: "bank_transfer", label: "Bank Transfer", icon: "🏧" },
  ];

  // Fetch bank accounts on mount
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // Fetch customer info when customer is selected
  useEffect(() => {
    if (formData.customer) {
      fetchCustomerInfo(formData.customer._id);
    } else {
      setCustomerInfo({
        outstandingDue: 0,
        availableCredit: 0,
        outstandingInvoices: [],
      });
      setInvoiceAllocations({});
      setCreditApplied(0);
    }
  }, [formData.customer]);

  // Auto-adjust deposit account when payment methods change
  useEffect(() => {
    const hasNonCashMethod = formData.paymentMethods.some(
      (pm) => pm.method !== "cash"
    );

    // If user switches to UPI or Bank Transfer and deposit account is still "cash",
    // and there are bank accounts available, suggest the first one
    if (
      hasNonCashMethod &&
      formData.depositAccount === "cash" &&
      bankAccounts.length > 0
    ) {
      setFormData({
        ...formData,
        depositAccount: bankAccounts[0]._id,
      });
    }
  }, [formData.paymentMethods]);

  const fetchBankAccounts = async () => {
    try {
      const response = await api.get(`${API_URL}/api/cashbank/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBankAccounts(response.data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const fetchCustomerInfo = async (customerId) => {
    try {
      const response = await api.get(
        `${API_URL}/api/payment-in/customer/${customerId}/info`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCustomerInfo(response.data);
    } catch (error) {
      console.error("Error fetching customer info:", error);
      toast.error("Failed to fetch customer information");
    }
  };

  const handleCustomerSelect = (customer) => {
    setFormData({ ...formData, customer });
    setShowCustomerModal(false);
  };

  const addPaymentMethod = () => {
    setFormData({
      ...formData,
      paymentMethods: [
        ...formData.paymentMethods,
        {
          method: "cash",
          amount: 0,
          reference: "",
          bankAccount: "",
          cardType: "",
          chequeNumber: "",
          chequeDate: "",
          chequeBank: "",
        },
      ],
    });
  };

  const removePaymentMethod = (index) => {
    const newMethods = formData.paymentMethods.filter((_, i) => i !== index);
    setFormData({ ...formData, paymentMethods: newMethods });
  };

  const updatePaymentMethod = (index, field, value) => {
    const newMethods = [...formData.paymentMethods];
    newMethods[index][field] = value;
    setFormData({ ...formData, paymentMethods: newMethods });
  };

  const handleInvoiceAllocation = (invoiceId, amount) => {
    setInvoiceAllocations({
      ...invoiceAllocations,
      [invoiceId]: parseFloat(amount) || 0,
    });
  };

  // Calculate totals
  const totalPayment = formData.paymentMethods.reduce(
    (sum, pm) => sum + (parseFloat(pm.amount) || 0),
    0
  );
  const totalAllocated = Object.values(invoiceAllocations).reduce(
    (sum, amt) => sum + amt,
    0
  );
  const effectivePayment = totalPayment + creditApplied;
  const remainingAmount = effectivePayment - totalAllocated;

  const handleSave = async () => {
    // Validation
    if (!formData.customer) {
      toast.error("Please select a customer");
      return;
    }

    if (totalPayment <= 0) {
      toast.error("Total payment must be greater than zero");
      return;
    }

    if (!formData.depositAccount) {
      toast.error("Please select a deposit account");
      return;
    }

    if (creditApplied > customerInfo.availableCredit) {
      toast.error(
        `Credit applied (₹${creditApplied}) exceeds available credit (₹${customerInfo.availableCredit})`
      );
      return;
    }

    if (totalAllocated > effectivePayment) {
      toast.error("Total allocated amount exceeds total payment");
      return;
    }

    // Validate each invoice allocation
    for (const invoice of customerInfo.outstandingInvoices) {
      const allocated = invoiceAllocations[invoice._id] || 0;
      if (allocated > invoice.balance) {
        toast.error(
          `Allocated amount for ${invoice.invoiceNo} exceeds invoice balance`
        );
        return;
      }
    }

    // Prepare payload
    const allocatedInvoices = Object.entries(invoiceAllocations)
      .filter(([_, amount]) => amount > 0)
      .map(([invoiceId, amount]) => ({
        invoice: invoiceId,
        allocatedAmount: parseFloat(amount),
      }));

    // Ensure all payment method amounts are numbers and remove empty fields
    const cleanedPaymentMethods = formData.paymentMethods
      .filter((pm) => parseFloat(pm.amount) > 0)
      .map((pm) => {
        const cleaned = {
          method: pm.method,
          amount: parseFloat(pm.amount),
        };

        // Only add optional fields if they have values
        if (pm.reference && pm.reference.trim())
          cleaned.reference = pm.reference.trim();
        if (pm.bankAccount && pm.bankAccount.trim())
          cleaned.bankAccount = pm.bankAccount.trim();
        if (pm.cardType && pm.cardType.trim())
          cleaned.cardType = pm.cardType.trim();
        if (pm.chequeNumber && pm.chequeNumber.trim())
          cleaned.chequeNumber = pm.chequeNumber.trim();
        if (pm.chequeDate && pm.chequeDate.trim())
          cleaned.chequeDate = pm.chequeDate.trim();
        if (pm.chequeBank && pm.chequeBank.trim())
          cleaned.chequeBank = pm.chequeBank.trim();

        return cleaned;
      });

    const payload = {
      customerId: formData.customer._id,
      paymentDate: formData.receiptDate,
      paymentMethods: cleanedPaymentMethods,
      allocatedInvoices,
      creditApplied: parseFloat(creditApplied) || 0,
      depositAccount: formData.depositAccount,
      notes: formData.notes,
    };

    try {
      setLoading(true);
      const response = await api.post(`${API_URL}/api/payment-in`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Payment recorded successfully!");

      // Reset form
      setFormData({
        receiptNo: "RCP-" + Date.now(),
        receiptDate: new Date().toISOString().split("T")[0],
        customer: null,
        paymentMethods: [
          {
            method: "cash",
            amount: 0,
            reference: "",
            bankAccount: "",
            cardType: "",
            chequeNumber: "",
            chequeDate: "",
            chequeBank: "",
          },
        ],
        depositAccount: "cash",
        notes: "",
      });
      setInvoiceAllocations({});
      setCreditApplied(0);
    } catch (error) {
      console.error("Error saving payment:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to save payment";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    // Validate form first
    const totalPayment = formData.paymentMethods.reduce(
      (sum, pm) => sum + parseFloat(pm.amount || 0),
      0
    );
    const totalAllocated = Object.values(invoiceAllocations).reduce(
      (sum, amount) => sum + parseFloat(amount || 0),
      0
    );
    const effectivePayment = totalPayment + parseFloat(creditApplied || 0);

    if (!formData.customer) {
      toast.error("Please select a customer");
      return;
    }

    if (totalPayment <= 0) {
      toast.error("Total payment must be greater than zero");
      return;
    }

    if (!formData.depositAccount) {
      toast.error("Please select a deposit account");
      return;
    }

    // Save payment first
    try {
      setLoading(true);

      // Prepare payload (same as handleSave)
      const allocatedInvoices = Object.entries(invoiceAllocations)
        .filter(([_, amount]) => amount > 0)
        .map(([invoiceId, amount]) => ({
          invoice: invoiceId,
          allocatedAmount: parseFloat(amount),
        }));

      const cleanedPaymentMethods = formData.paymentMethods
        .filter((pm) => parseFloat(pm.amount) > 0)
        .map((pm) => {
          const cleaned = {
            method: pm.method,
            amount: parseFloat(pm.amount),
          };

          if (pm.reference && pm.reference.trim())
            cleaned.reference = pm.reference.trim();
          if (pm.bankAccount && pm.bankAccount.trim())
            cleaned.bankAccount = pm.bankAccount.trim();
          if (pm.cardType && pm.cardType.trim())
            cleaned.cardType = pm.cardType.trim();
          if (pm.chequeNumber && pm.chequeNumber.trim())
            cleaned.chequeNumber = pm.chequeNumber.trim();
          if (pm.chequeDate && pm.chequeDate.trim())
            cleaned.chequeDate = pm.chequeDate.trim();
          if (pm.chequeBank && pm.chequeBank.trim())
            cleaned.chequeBank = pm.chequeBank.trim();

          return cleaned;
        });

      const payload = {
        customerId: formData.customer._id,
        paymentDate: formData.receiptDate,
        paymentMethods: cleanedPaymentMethods,
        allocatedInvoices,
        creditApplied: parseFloat(creditApplied) || 0,
        depositAccount: formData.depositAccount,
        notes: formData.notes,
      };

      const response = await api.post(`${API_URL}/api/payment-in`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Payment saved! Opening print preview...");

      // Navigate to receipt detail page and trigger print
      const paymentId = response.data.payment._id;
      navigate(`/sales/payment-in/${paymentId}`);

      // Trigger print after a short delay to allow page to load
      setTimeout(() => {
        window.print();
      }, 1000);
    } catch (error) {
      console.error("Error saving payment for print:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to save payment";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">
            Payment In
          </h1>
          <p className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
            Record customer payments and receipts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Payment Details */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">
                Payment Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Receipt Number"
                  value={formData.receiptNo}
                  onChange={(e) =>
                    setFormData({ ...formData, receiptNo: e.target.value })
                  }
                  required
                  disabled
                />
                <FormInput
                  label="Receipt Date"
                  type="date"
                  value={formData.receiptDate}
                  onChange={(e) =>
                    setFormData({ ...formData, receiptDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Customer</h2>
              {formData.customer ? (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                        {formData.customer.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        {formData.customer.phone}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <p className="text-xs text-orange-600 font-medium">
                          Outstanding: ₹{customerInfo.outstandingDue.toFixed(2)}
                        </p>
                        {customerInfo.availableCredit > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            Credit: ₹{customerInfo.availableCredit.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, customer: null })}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:border-indigo-500 hover:text-indigo-600 transition text-xs"
                >
                  Click to select customer
                </button>
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">Payment Methods</h2>
                <button
                  onClick={addPaymentMethod}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Add Method
                </button>
              </div>
              <div className="space-y-3">
                {formData.paymentMethods.map((pm, index) => (
                  <div
                    key={index}
                    className="p-2 border border-gray-200 dark:border-[rgb(var(--color-border))] rounded-lg"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">
                          Method
                        </label>
                        <select
                          value={pm.method}
                          onChange={(e) =>
                            updatePaymentMethod(index, "method", e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg"
                        >
                          {paymentMethodOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={pm.amount}
                          onChange={(e) =>
                            updatePaymentMethod(
                              index,
                              "amount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end">
                        {formData.paymentMethods.length > 1 && (
                          <button
                            onClick={() => removePaymentMethod(index)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Method-specific fields */}
                    {pm.method === "upi" && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Transaction Reference
                        </label>
                        <input
                          type="text"
                          value={pm.reference}
                          onChange={(e) =>
                            updatePaymentMethod(
                              index,
                              "reference",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-default rounded-lg"
                          placeholder="UPI Transaction ID"
                        />
                      </div>
                    )}
                    {pm.method === "card" && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Card Type
                        </label>
                        <select
                          value={pm.cardType}
                          onChange={(e) =>
                            updatePaymentMethod(index, "cardType", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-default rounded-lg"
                        >
                          <option value="">Select Card Type</option>
                          <option value="visa">Visa</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="rupay">RuPay</option>
                          <option value="amex">American Express</option>
                        </select>
                      </div>
                    )}
                    {(pm.method === "bank_transfer" ||
                      pm.method === "cheque") && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-2">
                              Bank Account
                            </label>
                            <select
                              value={pm.bankAccount}
                              onChange={(e) =>
                                updatePaymentMethod(
                                  index,
                                  "bankAccount",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-default rounded-lg"
                            >
                              <option value="">Select Bank Account</option>
                              {bankAccounts.map((acc) => (
                                <option key={acc._id} value={acc._id}>
                                  {acc.bankName} - {acc.accountNumber.slice(-4)}
                                </option>
                              ))}
                            </select>
                          </div>
                          {pm.method === "cheque" && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Cheque Number
                                </label>
                                <input
                                  type="text"
                                  value={pm.chequeNumber}
                                  onChange={(e) =>
                                    updatePaymentMethod(
                                      index,
                                      "chequeNumber",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-default rounded-lg"
                                  placeholder="Cheque No"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Cheque Date
                                </label>
                                <input
                                  type="date"
                                  value={pm.chequeDate}
                                  onChange={(e) =>
                                    updatePaymentMethod(
                                      index,
                                      "chequeDate",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-default rounded-lg"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* Deposit To */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Deposit To</h2>
              {(() => {
                // Check if any payment method is not cash
                const hasNonCashMethod = formData.paymentMethods.some(
                  (pm) => pm.method !== "cash"
                );

                // If there's a non-cash payment method, show only bank accounts
                if (hasNonCashMethod) {
                  return (
                    <select
                      value={formData.depositAccount}
                      onChange={(e) =>
                        setFormData({ ...formData, depositAccount: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-default rounded-lg"
                      required
                    >
                      <option value="">Select Bank Account</option>
                      {bankAccounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          🏦 {acc.bankName} - {acc.accountNumber.slice(-4)}
                        </option>
                      ))}
                    </select>
                  );
                }

                // Otherwise, show both cash and bank accounts
                return (
                  <select
                    value={formData.depositAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, depositAccount: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-default rounded-lg"
                    required
                  >
                    <option value="cash">💵 Cash in Hand</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        🏦 {acc.bankName} - {acc.accountNumber.slice(-4)}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Outstanding Invoices */}
            {formData.customer && customerInfo.outstandingInvoices.length > 0 && (
              <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">
                  Outstanding Invoices
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                          Invoice No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                          Pay Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customerInfo.outstandingInvoices.map((invoice) => (
                        <tr key={invoice._id}>
                          <td className="px-4 py-3 font-medium text-indigo-600">
                            {invoice.invoiceNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            ₹{invoice.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-medium text-orange-600">
                            ₹{invoice.balance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={invoiceAllocations[invoice._id] || 0}
                              onChange={(e) =>
                                handleInvoiceAllocation(
                                  invoice._id,
                                  e.target.value
                                )
                              }
                              className="w-32 px-3 py-1 border border-default rounded-lg"
                              placeholder="0.00"
                              max={invoice.balance}
                              min="0"
                              step="0.01"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Notes</h2>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows="2"
                className="w-full px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Add any notes about this payment..."
              />
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">
                Payment Summary
              </h2>

              <div className="space-y-3 mb-6 p-4 bg-surface rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Total Payment:</span>
                  <span className="font-medium text-green-600">
                    ₹{totalPayment.toFixed(2)}
                  </span>
                </div>

                {customerInfo.availableCredit > 0 && (
                  <div className="border-t pt-3">
                    <label className="block text-sm text-secondary mb-2">
                      Use Customer Credit:
                    </label>
                    <input
                      type="number"
                      value={creditApplied}
                      onChange={(e) =>
                        setCreditApplied(
                          Math.min(
                            parseFloat(e.target.value) || 0,
                            customerInfo.availableCredit
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-default rounded-lg"
                      placeholder="0.00"
                      max={customerInfo.availableCredit}
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted mt-1">
                      Available: ₹{customerInfo.availableCredit.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-secondary">Effective Payment:</span>
                  <span className="font-medium">
                    ₹{effectivePayment.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Allocated to Invoices:</span>
                  <span className="font-medium">
                    ₹{totalAllocated.toFixed(2)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Remaining:</span>
                    <span
                      className={`text-lg font-bold ${remainingAmount >= 0 ? "text-gray-900" : "text-red-600"
                        }`}
                    >
                      ₹{remainingAmount.toFixed(2)}
                    </span>
                  </div>
                  {remainingAmount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Will be added as customer credit
                    </p>
                  )}
                  {remainingAmount < 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Payment insufficient!
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Payment"}
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />
    </Layout>
  );
};

export default PaymentIn;
