import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import PaymentModal from '../../components/PaymentModal';
import {
    getBillById,
    recordPayment,
    approveBill,
    rejectBill,
    clearBill
} from '../../redux/slices/billSlice';

const BillDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { bill, isLoading } = useSelector(state => state.bill);

    const [paymentModal, setPaymentModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (id) {
            dispatch(getBillById(id));
        }
        return () => {
            dispatch(clearBill());
        };
    }, [id, dispatch]);

    const handlePaymentSubmit = async (paymentData) => {
        try {
            await dispatch(recordPayment({ id: bill._id, paymentData })).unwrap();
            toast.success('Payment recorded successfully');
            setPaymentModal(false);
            dispatch(getBillById(id));
        } catch (error) {
            toast.error(error || 'Payment failed');
        }
    };

    const handleApprove = async () => {
        try {
            await dispatch(approveBill(bill._id)).unwrap();
            toast.success('Bill approved successfully');
            dispatch(getBillById(id));
        } catch (error) {
            toast.error(error || 'Approval failed');
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        try {
            await dispatch(rejectBill({ id: bill._id, reason: rejectionReason })).unwrap();
            toast.success('Bill rejected');
            setRejectModal(false);
            setRejectionReason('');
            dispatch(getBillById(id));
        } catch (error) {
            toast.error(error || 'Rejection failed');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'unpaid': return 'bg-gray-100 text-gray-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getApprovalColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading bill details...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!bill) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <p className="text-gray-600">Bill not found</p>
                    <button
                        onClick={() => navigate('/purchase/bills')}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Back to Bills
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <PageHeader
                title={`Bill ${bill.billNo}`}
                description={`Supplier: ${bill.supplier?.businessName || 'N/A'}`}
                actions={[
                    <button
                        key="back"
                        onClick={() => navigate('/purchase/bills')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        ← Back
                    </button>,
                    bill.approvalStatus === 'draft' && (
                        <button
                            key="approve"
                            onClick={handleApprove}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Approve Bill
                        </button>
                    ),
                    bill.approvalStatus === 'draft' && (
                        <button
                            key="reject"
                            onClick={() => setRejectModal(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Reject Bill
                        </button>
                    ),
                    bill.paymentStatus !== 'paid' && bill.approvalStatus === 'approved' && (
                        <button
                            key="pay"
                            onClick={() => setPaymentModal(true)}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Record Payment
                        </button>
                    )
                ].filter(Boolean)}
            />

            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Bill Information</h3>
                        <div className="space-y-2">
                            <div>
                                <span className="text-xs text-gray-500">Bill No:</span>
                                <p className="font-semibold">{bill.billNo}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Bill Date:</span>
                                <p>{new Date(bill.billDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Due Date:</span>
                                <p>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            {bill.purchase && (
                                <div>
                                    <span className="text-xs text-gray-500">Linked Purchase:</span>
                                    <p className="text-indigo-600 cursor-pointer hover:underline">
                                        {bill.purchaseNo || bill.purchase.purchaseNo}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Supplier Invoice</h3>
                        <div className="space-y-2">
                            <div>
                                <span className="text-xs text-gray-500">Invoice No:</span>
                                <p className="font-semibold">{bill.supplierInvoiceNo}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Invoice Date:</span>
                                <p>{new Date(bill.supplierInvoiceDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                        <div className="space-y-2">
                            <div>
                                <span className="text-xs text-gray-500">Payment Status:</span>
                                <p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bill.paymentStatus)}`}>
                                        {bill.paymentStatus}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Approval Status:</span>
                                <p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getApprovalColor(bill.approvalStatus)}`}>
                                        {bill.approvalStatus}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Amount Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">₹{bill.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Paid Amount</p>
                        <p className="text-2xl font-bold text-green-600">₹{bill.paidAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Credit Applied</p>
                        <p className="text-2xl font-bold text-purple-600">₹{(bill.totalCreditApplied || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Outstanding</p>
                        <p className="text-2xl font-bold text-red-600">₹{bill.outstandingAmount.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Items Breakup */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Items</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bill.items?.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-3 text-sm">{item.itemName}</td>
                                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-right">₹{item.purchaseRate.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-right">₹{(item.discount || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        {item.cgst > 0 && <div>CGST: ₹{item.cgst.toFixed(2)}</div>}
                                        {item.sgst > 0 && <div>SGST: ₹{item.sgst.toFixed(2)}</div>}
                                        {item.igst > 0 && <div>IGST: ₹{item.igst.toFixed(2)}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold">₹{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Tax Summary */}
                <div className="mt-4 border-t pt-4">
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>₹{bill.subtotal.toFixed(2)}</span>
                            </div>
                            {bill.billDiscount > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Bill Discount:</span>
                                    <span>-₹{bill.billDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {bill.shippingCharges > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>Shipping:</span>
                                    <span>₹{bill.shippingCharges.toFixed(2)}</span>
                                </div>
                            )}
                            {bill.totalCGST > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>CGST:</span>
                                    <span>₹{bill.totalCGST.toFixed(2)}</span>
                                </div>
                            )}
                            {bill.totalSGST > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>SGST:</span>
                                    <span>₹{bill.totalSGST.toFixed(2)}</span>
                                </div>
                            )}
                            {bill.totalIGST > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>IGST:</span>
                                    <span>₹{bill.totalIGST.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>Total:</span>
                                <span>₹{bill.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            {bill.payments && bill.payments.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bill.payments.map((payment, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-sm capitalize">{payment.paymentMethod}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{payment.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm">{payment.reference || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{payment.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Credit Notes Applied */}
            {bill.creditNotesApplied && bill.creditNotesApplied.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Credit Notes Applied</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Note No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bill.creditNotesApplied.map((credit, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 text-sm">{credit.creditNoteNo}</td>
                                        <td className="px-4 py-3 text-sm">{new Date(credit.appliedDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-purple-600">₹{credit.appliedAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Audit Log */}
            {bill.auditLog && bill.auditLog.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Audit Trail</h3>
                    <div className="space-y-3">
                        {bill.auditLog.map((log, index) => (
                            <div key={index} className="flex items-start space-x-3 text-sm">
                                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-600"></div>
                                <div className="flex-1">
                                    <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                                    <p className="text-gray-600">{log.details}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(log.performedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {paymentModal && (
                <PaymentModal
                    isOpen={paymentModal}
                    onClose={() => setPaymentModal(false)}
                    onSubmit={handlePaymentSubmit}
                    documentType="Bill"
                    totalAmount={bill.totalAmount}
                    paidAmount={bill.paidAmount || 0}
                />
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-white/20">
                        <h3 className="text-lg font-bold text-main mb-4">Reject Bill</h3>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejecting this bill:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex space-x-4 mt-4">
                            <button
                                onClick={() => {
                                    setRejectModal(false);
                                    setRejectionReason('');
                                }}
                                className="flex-1 px-4 py-2 border border-default text-secondary rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Reject Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default BillDetail;
