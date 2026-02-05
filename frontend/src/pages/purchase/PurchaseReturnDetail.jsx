import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../services/api';
import ApprovalActionModal from '../../components/purchase-return/ApprovalActionModal';

const PurchaseReturnDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalAction, setApprovalAction] = useState(null);

    useEffect(() => {
        fetchReturnDetails();
    }, [id]);

    const fetchReturnDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/purchase-returns/${id}`);
            setReturnData(response.data);
        } catch (err) {
            console.error('Error fetching return details:', err);
            toast.error('Failed to fetch return details');
            navigate('/purchase/returns');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = () => {
        setApprovalAction('approve');
        setShowApprovalModal(true);
    };

    const handleReject = () => {
        setApprovalAction('reject');
        setShowApprovalModal(true);
    };

    const handleCancel = async () => {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        try {
            await api.post(`/api/purchase-returns/${id}/cancel`, { reason });
            toast.success('Purchase return cancelled successfully');
            fetchReturnDetails();
        } catch (err) {
            console.error('Error cancelling return:', err);
            toast.error(err.response?.data?.message || 'Failed to cancel return');
        }
    };

    const handleApprovalComplete = () => {
        setShowApprovalModal(false);
        fetchReturnDetails();
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Draft' },
            pending_approval: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending Approval' },
            approved: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Approved' },
            rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Rejected' },
            processing: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'Processing' },
            completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Completed' },
            cancelled: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Cancelled' },
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">Loading...</p>
                </div>
            </Layout>
        );
    }

    if (!returnData) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">Return not found</p>
                </div>
            </Layout>
        );
    }

    const tabs = [
        { id: 'summary', label: 'Summary', icon: '📋' },
        { id: 'items', label: 'Items', icon: '📦', badge: returnData.items?.length },
        { id: 'financials', label: 'Financials', icon: '💰' },
        { id: 'inventory', label: 'Inventory Impact', icon: '📊' },
        { id: 'approvals', label: 'Approvals', icon: '✓' },
        { id: 'audit', label: 'Audit Trail', icon: '📝' },
    ];

    return (
        <Layout>
            <PageHeader
                title={`Purchase Return: ${returnData.returnId}`}
                subtitle={`Created on ${new Date(returnData.createdAt).toLocaleDateString()}`}
                backLink="/purchase/returns"
            />

            {/* Header Card */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-1">Status</p>
                        {getStatusBadge(returnData.status)}
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-1">Supplier</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{returnData.supplier?.businessName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{returnData.totalAmount?.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-1">Refund Mode</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] capitalize">
                            {returnData.refundMode?.replace('_', ' ')}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex space-x-2">
                    {returnData.status === 'pending_approval' && (
                        <>
                            <button
                                onClick={handleApprove}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                ✓ Approve
                            </button>
                            <button
                                onClick={handleReject}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                ✗ Reject
                            </button>
                        </>
                    )}
                    {['draft', 'approved', 'completed'].includes(returnData.status) && (
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Cancel Return
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-[rgb(var(--color-text))] hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        🖨️ Print
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] border-b dark:border-gray-700 mb-4">
                <div className="flex space-x-6 px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-700 dark:hover:text-[rgb(var(--color-text))]'
                                }`}
                        >
                            <span className="mr-1.5">{tab.icon}</span>
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="ml-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 py-0.5 px-1.5 rounded-full text-xs">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Return Information</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Return ID</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{returnData.returnId}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Return Date</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            {new Date(returnData.returnDate).toLocaleDateString()}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Return Type</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))] capitalize">{returnData.returnType}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Warehouse</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{returnData.warehouse || 'N/A'}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Supplier Details</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Business Name</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            {returnData.supplier?.businessName}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Contact Person</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            {returnData.supplier?.contactPersonName}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Contact Number</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            {returnData.supplier?.contactNo}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Email</dt>
                                        <dd className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            {returnData.supplier?.email || 'N/A'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Return Reason</h3>
                            <p className="text-xs text-gray-700 dark:text-[rgb(var(--color-text-secondary))] bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                {returnData.returnReason}
                            </p>
                        </div>

                        {returnData.notes && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">Notes</h3>
                                <p className="text-xs text-gray-700 dark:text-[rgb(var(--color-text-secondary))] bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    {returnData.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Tab */}
                {activeTab === 'items' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Item</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Batch/Expiry</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Qty</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Rate</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Tax</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Total</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Condition</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Disposition</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[rgb(var(--color-card))] divide-y divide-gray-200 dark:divide-gray-700">
                                {returnData.items?.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-3 py-2">
                                            <p className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{item.itemName}</p>
                                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{item.sku || 'N/A'}</p>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                            <p>{item.batchNo || 'N/A'}</p>
                                            {item.expiryDate && (
                                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {new Date(item.expiryDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.returnQty || item.quantity}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.rate?.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.taxRate}%</td>
                                        <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.total?.toFixed(2)}</td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                {item.condition}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                {item.disposition}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Financials Tab */}
                {activeTab === 'financials' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Item Totals</h3>
                                <dl className="space-y-2">
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">Subtotal</dt>
                                        <dd className="text-sm font-medium">₹{returnData.subtotal?.toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">Item Discount</dt>
                                        <dd className="text-sm font-medium text-red-600">- ₹{returnData.itemDiscount?.toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">Bill Discount</dt>
                                        <dd className="text-sm font-medium text-red-600">- ₹{returnData.billDiscount?.toFixed(2)}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Tax Breakdown</h3>
                                <dl className="space-y-2">
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">CGST</dt>
                                        <dd className="text-sm font-medium">₹{returnData.totalCGST?.toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">SGST</dt>
                                        <dd className="text-sm font-medium">₹{returnData.totalSGST?.toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-600">IGST</dt>
                                        <dd className="text-sm font-medium">₹{returnData.totalIGST?.toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                        <dt className="text-sm font-semibold">Total Tax</dt>
                                        <dd className="text-sm font-semibold">₹{returnData.taxAmount?.toFixed(2)}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                            <div className="flex justify-between items-center">
                                <span className="text-xl font-semibold text-gray-900">Total Return Amount</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ₹{returnData.totalAmount?.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Inventory Impact Tab */}
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        {returnData.items?.reduce((acc, item) => {
                            if (!acc[item.disposition]) acc[item.disposition] = [];
                            acc[item.disposition].push(item);
                            return acc;
                        }, {}) && Object.entries(returnData.items.reduce((acc, item) => {
                            if (!acc[item.disposition]) acc[item.disposition] = [];
                            acc[item.disposition].push(item);
                            return acc;
                        }, {})).map(([disposition, items]) => (
                            <div key={disposition} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-gray-100 font-semibold capitalize">
                                    {disposition.replace('_', ' ')} ({items.length} items)
                                </div>
                                <div className="p-4">
                                    <ul className="space-y-2">
                                        {items.map((item, idx) => (
                                            <li key={idx} className="flex justify-between text-sm">
                                                <span>{item.itemName}</span>
                                                <span className="font-medium">{item.returnQty || item.quantity} units</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && (
                    <div className="space-y-6">
                        {returnData.approvalWorkflow ? (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Timeline</h3>
                                <div className="space-y-4">
                                    {returnData.approvalWorkflow.approvalLevels?.map((level, index) => (
                                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        Level {level.level}: {level.approverName}
                                                    </p>
                                                    <p className="text-sm text-gray-600">{level.approverEmail}</p>
                                                    {level.comments && (
                                                        <p className="text-sm text-gray-700 mt-2 italic">"{level.comments}"</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${level.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        level.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {level.status}
                                                    </span>
                                                    {level.actionDate && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(level.actionDate).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No approval workflow required</p>
                        )}
                    </div>
                )}

                {/* Audit Trail Tab */}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        <div className="border-l-4 border-gray-300 pl-4 py-2">
                            <p className="font-medium text-gray-900">Created</p>
                            <p className="text-sm text-gray-600">{new Date(returnData.createdAt).toLocaleString()}</p>
                        </div>
                        {returnData.submittedForApprovalAt && (
                            <div className="border-l-4 border-yellow-500 pl-4 py-2">
                                <p className="font-medium text-gray-900">Submitted for Approval</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(returnData.submittedForApprovalAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {returnData.approvedAt && (
                            <div className="border-l-4 border-green-500 pl-4 py-2">
                                <p className="font-medium text-gray-900">Approved</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(returnData.approvedAt).toLocaleString()}
                                </p>
                                {returnData.approvedBy && (
                                    <p className="text-sm text-gray-600">By: {returnData.approvedBy.name}</p>
                                )}
                            </div>
                        )}
                        {returnData.rejectedAt && (
                            <div className="border-l-4 border-red-500 pl-4 py-2">
                                <p className="font-medium text-gray-900">Rejected</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(returnData.rejectedAt).toLocaleString()}
                                </p>
                                {returnData.rejectionReason && (
                                    <p className="text-sm text-gray-700 mt-1 italic">"{returnData.rejectionReason}"</p>
                                )}
                            </div>
                        )}
                        {returnData.completedAt && (
                            <div className="border-l-4 border-green-500 pl-4 py-2">
                                <p className="font-medium text-gray-900">Completed</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(returnData.completedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {returnData.cancelledAt && (
                            <div className="border-l-4 border-gray-500 pl-4 py-2">
                                <p className="font-medium text-gray-900">Cancelled</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(returnData.cancelledAt).toLocaleString()}
                                </p>
                                {returnData.cancelReason && (
                                    <p className="text-sm text-gray-700 mt-1 italic">"{returnData.cancelReason}"</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Professional Print Layout (Hidden on screen, shown only when printing) */}
            <div className="print-only" style={{ display: 'none' }}>
                {/* Print Header */}
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 3px 0', color: '#1f2937' }}>
                                PURCHASE RETURN
                            </h1>
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>BizzAI Inventory Management</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 3px 0' }}>{returnData.returnId}</p>
                            <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>
                                Date: {new Date(returnData.returnDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status and Key Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 3px 0', textTransform: 'uppercase', fontWeight: '600' }}>Status</p>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, textTransform: 'capitalize' }}>
                            {returnData.status.replace('_', ' ')}
                        </p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 3px 0', textTransform: 'uppercase', fontWeight: '600' }}>Total Amount</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#2563eb' }}>
                            ₹{returnData.totalAmount?.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Supplier Details */}
                <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1f2937', textTransform: 'uppercase' }}>
                        Supplier Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 2px 0' }}>Business Name</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>{returnData.supplier?.businessName}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 2px 0' }}>Contact Person</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>{returnData.supplier?.contactPersonName}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 2px 0' }}>Contact Number</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>{returnData.supplier?.contactNo}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 2px 0' }}>Email</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>{returnData.supplier?.email || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Return Information */}
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '4px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#92400e', textTransform: 'uppercase' }}>
                        Return Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                            <p style={{ fontSize: '9px', color: '#78350f', margin: '0 0 2px 0' }}>Return Type</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'capitalize' }}>{returnData.returnType}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '9px', color: '#78350f', margin: '0 0 2px 0' }}>Refund Mode</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'capitalize' }}>
                                {returnData.refundMode?.replace('_', ' ')}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '9px', color: '#78350f', margin: '0 0 2px 0' }}>Warehouse</p>
                            <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>{returnData.warehouse || 'N/A'}</p>
                        </div>
                    </div>
                    {returnData.returnReason && (
                        <div style={{ marginTop: '8px' }}>
                            <p style={{ fontSize: '9px', color: '#78350f', margin: '0 0 2px 0' }}>Return Reason</p>
                            <p style={{ fontSize: '11px', margin: 0 }}>{returnData.returnReason}</p>
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div style={{ marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1f2937', textTransform: 'uppercase' }}>
                        Items
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2563eb', color: 'white' }}>
                                <th style={{ padding: '6px 5px', textAlign: 'left', fontWeight: '600', fontSize: '9px' }}>Item</th>
                                <th style={{ padding: '6px 5px', textAlign: 'center', fontWeight: '600', fontSize: '9px' }}>Batch</th>
                                <th style={{ padding: '6px 5px', textAlign: 'center', fontWeight: '600', fontSize: '9px' }}>Qty</th>
                                <th style={{ padding: '6px 5px', textAlign: 'right', fontWeight: '600', fontSize: '9px' }}>Rate</th>
                                <th style={{ padding: '6px 5px', textAlign: 'center', fontWeight: '600', fontSize: '9px' }}>Tax%</th>
                                <th style={{ padding: '6px 5px', textAlign: 'right', fontWeight: '600', fontSize: '9px' }}>Amount</th>
                                <th style={{ padding: '6px 5px', textAlign: 'center', fontWeight: '600', fontSize: '9px' }}>Condition</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returnData.items?.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '6px 5px' }}>
                                        <div style={{ fontWeight: '600', fontSize: '10px' }}>{item.itemName}</div>
                                        <div style={{ fontSize: '8px', color: '#6b7280' }}>{item.sku || 'N/A'}</div>
                                    </td>
                                    <td style={{ padding: '6px 5px', textAlign: 'center', fontSize: '9px' }}>{item.batchNo || '-'}</td>
                                    <td style={{ padding: '6px 5px', textAlign: 'center', fontWeight: '600', fontSize: '10px' }}>
                                        {item.returnQty || item.quantity}
                                    </td>
                                    <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: '9px' }}>₹{item.rate?.toFixed(2)}</td>
                                    <td style={{ padding: '6px 5px', textAlign: 'center', fontSize: '9px' }}>{item.taxRate}%</td>
                                    <td style={{ padding: '6px 5px', textAlign: 'right', fontWeight: '600', fontSize: '10px' }}>
                                        ₹{item.total?.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '6px 5px', textAlign: 'center', fontSize: '8px', textTransform: 'capitalize' }}>
                                        {item.condition}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Financial Summary */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <div style={{ width: '250px', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>Subtotal:</span>
                                <span style={{ fontSize: '10px', fontWeight: '600' }}>₹{returnData.subtotal?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>Item Discount:</span>
                                <span style={{ fontSize: '10px', fontWeight: '600', color: '#dc2626' }}>
                                    - ₹{returnData.itemDiscount?.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>Bill Discount:</span>
                                <span style={{ fontSize: '10px', fontWeight: '600', color: '#dc2626' }}>
                                    - ₹{returnData.billDiscount?.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>Tax Amount:</span>
                                <span style={{ fontSize: '10px', fontWeight: '600' }}>₹{returnData.taxAmount?.toFixed(2)}</span>
                            </div>
                        </div>
                        <div style={{ padding: '8px 10px', backgroundColor: '#2563eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>Total Amount:</span>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
                                    ₹{returnData.totalAmount?.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {returnData.notes && (
                    <div style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1f2937', textTransform: 'uppercase' }}>
                            Notes
                        </h3>
                        <p style={{ fontSize: '10px', margin: 0, lineHeight: '1.4' }}>{returnData.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '25px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <p style={{ fontSize: '8px', color: '#9ca3af', margin: 0 }}>
                        Generated on {new Date().toLocaleString()} | BizzAI Inventory Management System
                    </p>
                </div>
            </div>

            {/* Approval Action Modal */}
            {showApprovalModal && (
                <ApprovalActionModal
                    returnId={id}
                    action={approvalAction}
                    onClose={() => setShowApprovalModal(false)}
                    onComplete={handleApprovalComplete}
                />
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    /* Hide screen-only elements */
                    nav, header, button, .no-print {
                        display: none !important;
                    }

                    /* Hide all main content sections (tabs, etc) */
                    .bg-white.rounded-lg.shadow,
                    .bg-white.border-b {
                        display: none !important;
                    }

                    /* Show print-only layout */
                    .print-only {
                        display: block !important;
                        padding: 20px;
                        max-width: 210mm;
                        margin: 0 auto;
                    }

                    /* Page setup */
                    @page {
                        size: A4;
                        margin: 10mm;
                    }

                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                        background: white !important;
                    }

                    /* Ensure colors print correctly */
                    * {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    /* Table improvements */
                    table {
                        page-break-inside: avoid;
                    }

                    /* Prevent breaks in important sections */
                    .print-only > div {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </Layout>
    );
};

export default PurchaseReturnDetail;
