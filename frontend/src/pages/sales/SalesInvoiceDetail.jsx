import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { getSalesInvoiceById, reset, clearSalesInvoice, markSalesInvoiceAsPaid } from '../../redux/slices/salesInvoiceSlice';
import Layout from '../../components/Layout';
import PaymentModal from '../../components/PaymentModal';

const SalesInvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { invoice, isLoading, isError, message } = useSelector((state) => state.salesInvoice);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Detect window resize for responsive design
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        dispatch(getSalesInvoiceById(id));
        return () => {
            dispatch(reset());
        };
    }, [dispatch, id]);

    const handlePrint = () => {
        window.print();
    };

    const handlePayment = async (paymentData) => {
        const result = await dispatch(markSalesInvoiceAsPaid({
            id: invoice._id,
            amount: paymentData.amount, // Fixed: PaymentModal sends 'amount', not 'paidAmount'
            bankAccount: paymentData.bankAccount,
            paymentMethod: paymentData.paymentMethod
        }));

        if (result.meta.requestStatus === 'fulfilled') {
            setShowPaymentModal(false);
            // Refresh invoice data
            dispatch(getSalesInvoiceById(id));
        }
    };

    if (isLoading || !invoice) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    if (isError) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto">
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{message}</p>
                    </div>
                    <button
                        onClick={() => navigate('/sales/invoice')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        Back to Sales Invoices
                    </button>
                </div>
            </Layout>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'partial':
                return 'bg-yellow-100 text-yellow-800';
            case 'unpaid':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100  text-secondary';
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                {/* Header - Hidden on print */}
                <div className="mb-1 md:mb-6 print:hidden">
                    <button
                        onClick={() => navigate('/sales/invoice')}
                        className="flex items-center text-secondary hover:text-main mb-1 md:mb-3"
                    >
                        <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-[10px] md:text-sm">Back to Sales Invoices</span>
                    </button>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-sm md:text-xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-1">Sales Invoice Details</h1>
                            <p className="text-[10px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">View and print sales invoice</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-1 md:gap-2">
                            {invoice && invoice.paymentStatus !== 'paid' && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="flex items-center justify-center space-x-1 md:space-x-2 px-2 py-0.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Record Payment</span>
                                </button>
                            )}
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center space-x-1 md:space-x-2 px-2 py-0.5 md:px-4 md:py-2 text-xs md:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span>Print Invoice</span>
                            </button>
                            <button
                                onClick={() => {
                                    dispatch(clearSalesInvoice());
                                    dispatch(reset());
                                    navigate('/sales/invoice');
                                }}
                                className="flex items-center justify-center space-x-1 md:space-x-2 px-2 py-0.5 md:px-4 md:py-2 text-xs md:text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Done - Return to Sales</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Invoice Card */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-xl shadow-sm p-1 md:p-3 print:shadow-none">
                    {/* Invoice Header */}
                    <div className="border-b pb-1 md:pb-3 mb-1 md:mb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xs md:text-lg font-bold text-indigo-600 dark:text-[rgb(var(--color-primary))] mb-0.5 md:mb-1">INVOICE</h2>
                                <div className="text-[10px] md:text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{invoice.invoiceNo}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] md:text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] mb-0.5">Invoice Date</div>
                                <div className="text-[10px] md:text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                    {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </div>
                                <div className="text-[8px] md:text-xs text-gray-400 dark:text-[rgb(var(--color-text-muted))] mt-0.5">
                                    {new Date(invoice.createdAt).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-3 mb-1 md:mb-3">
                        <div>
                            <h3 className="text-[9px] md:text-xs font-semibold text-gray-500 dark:text-[rgb(var(--color-text-muted))] uppercase mb-0.5 md:mb-1">Bill To</h3>
                            {invoice.customer ? (
                                <div>
                                    <div className="text-xs md:text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{invoice.customer.name}</div>
                                    <div className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-0.5">{invoice.customer.phone}</div>
                                    {invoice.customer.email && (
                                        <div className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{invoice.customer.email}</div>
                                    )}
                                    {invoice.customer.address && (
                                        <div className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-0.5">{invoice.customer.address}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Walk-in Customer</div>
                            )}
                        </div>

                        <div className="text-left md:text-right">
                            <h3 className="text-[9px] md:text-xs font-semibold text-gray-500 dark:text-[rgb(var(--color-text-muted))] uppercase mb-0.5 md:mb-1">Payment Status</h3>
                            <span className={`inline-block px-1 py-0.5 md:px-2 md:py-1 rounded-full text-[8px] md:text-sm font-semibold ${getStatusColor(invoice.paymentStatus)}`}>
                                {invoice.paymentStatus.toUpperCase()}
                            </span>
                            <div className="mt-1 md:mt-2">
                                <div className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Payment Method</div>
                                <div className="text-[10px] md:text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))] capitalize">{invoice.paymentMethod}</div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-1 md:mb-3">
                        {/* Desktop Table */}
                        <table className="w-full hidden md:table">
                            <thead>
                                <tr className="border-b-2 border-gray-200 dark:border-[rgb(var(--color-border))]">
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">#</th>
                                    <th className="text-left py-1 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Item</th>
                                    <th className="text-right py-1 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Quantity</th>
                                    <th className="text-right py-1 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Price</th>
                                    <th className="text-right py-1 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                        <td className="py-1 px-2 text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{index + 1}</td>
                                        <td className="py-1 px-2 text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">{item.name || 'Item'}</td>
                                        <td className="py-1 px-2 text-right text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">{item.quantity}</td>
                                        <td className="py-1 px-2 text-right text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.price.toFixed(2)}</td>
                                        <td className="py-1 px-2 text-right text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            ₹{item.total.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile Card Layout */}
                        <div className="block md:hidden">
                            {invoice.items.map((item, index) => (
                                <div key={index} className="py-0.5 px-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))] last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <span className="text-[9px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{index + 1}.</span>
                                            <span className="text-[10px] font-medium text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{item.name || 'Item'}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-[10px] font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.total.toFixed(0)}</div>
                                            <div className="text-[8px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{item.quantity} × ₹{item.price.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full md:w-64">
                            <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                <span className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Subtotal:</span>
                                <span className="text-[10px] md:text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">₹{invoice.subtotal.toFixed(2)}</span>
                            </div>
                            {invoice.tax > 0 && (
                                <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                    <span className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Tax:</span>
                                    <span className="text-[10px] md:text-sm font-medium text-green-600">+₹{invoice.tax.toFixed(2)}</span>
                                </div>
                            )}
                            {invoice.discount > 0 && (
                                <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                    <span className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Discount:</span>
                                    <span className="text-[10px] md:text-sm font-medium text-red-600">-₹{invoice.discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-0.5 md:py-1 border-b-2 border-gray-300 dark:border-[rgb(var(--color-border))]">
                                <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">Total Amount:</span>
                                <span className="text-xs md:text-sm font-bold text-indigo-600 dark:text-[rgb(var(--color-primary))]">
                                    ₹{invoice.totalAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                <span className="text-[9px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Paid Amount:</span>
                                <span className="text-[10px] md:text-sm font-medium text-green-600">₹{invoice.paidAmount.toFixed(2)}</span>
                            </div>
                            {invoice.paidAmount < invoice.totalAmount && (
                                <div className="flex justify-between py-0.5 md:py-1">
                                    <span className="text-[10px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-medium">Balance Due:</span>
                                    <span className="text-xs md:text-sm font-bold text-red-600">
                                        ₹{(invoice.totalAmount - invoice.paidAmount).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-2 md:mt-4 pt-1 md:pt-3 border-t border-gray-200 dark:border-[rgb(var(--color-border))] text-center text-gray-400 dark:text-[rgb(var(--color-text-muted))] text-[9px] md:text-xs">
                        <p>Thank you for your business!</p>
                        <p className="mt-0.5 md:mt-2">This is a computer-generated invoice.</p>
                    </div>
                </div>

                {/* Additional Info - Hidden on print */}
                <div className="mt-1 md:mt-3 bg-blue-50 dark:bg-blue-900/20 rounded md:rounded-lg p-1 md:p-2 print:hidden">
                    <div className="flex items-start">
                        <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-1 md:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-blue-900 dark:text-blue-300 font-medium text-[10px] md:text-sm mb-0.5">Invoice Information</h4>
                            <p className="text-blue-800 dark:text-blue-400 text-[9px] md:text-xs truncate">
                                Created on {new Date(invoice.createdAt).toLocaleString('en-IN')}
                            </p>
                            {invoice.customer && (
                                <p className="text-blue-800 dark:text-blue-400 text-[9px] md:text-xs mt-0.5 truncate">
                                    Customer: {invoice.customer.name} ({invoice.customer.phone})
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSubmit={handlePayment}
                    documentType="Sales Invoice"
                    totalAmount={invoice.totalAmount}
                    paidAmount={invoice.paidAmount}
                />
            )}
        </Layout>
    );
};

export default SalesInvoiceDetail;
