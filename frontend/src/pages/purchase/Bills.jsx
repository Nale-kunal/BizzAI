import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import PaymentModal from '../../components/PaymentModal';
import {
    getAllBills,
    deleteBill,
    recordPayment,
    approveBill,
    rejectBill,
    getBillAnalytics,
    reset
} from '../../redux/slices/billSlice';
import { getAllSuppliers } from '../../redux/slices/supplierSlice';

const Bills = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { bills, analytics, isLoading, isError, message } = useSelector(state => state.bill);
    const { suppliers } = useSelector(state => state.suppliers);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [agingFilter, setAgingFilter] = useState('all');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, bill: null });
    const [approvalModal, setApprovalModal] = useState({ isOpen: false, bill: null, action: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        dispatch(getAllBills());
        dispatch(getAllSuppliers());
        dispatch(getBillAnalytics());
        return () => {
            dispatch(reset());
        };
    }, [dispatch]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'unpaid': return 'bg-gray-100 text-gray-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getAgingColor = (agingBucket) => {
        switch (agingBucket) {
            case 'Not Due': return 'bg-blue-100 text-blue-800';
            case 'Due Today': return 'bg-orange-100 text-orange-800';
            case '1-30 Days': return 'bg-yellow-100 text-yellow-800';
            case '31-60 Days': return 'bg-red-100 text-red-800';
            case '60+ Days': return 'bg-red-200 text-red-900';
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

    const calculateAging = (bill) => {
        if (!bill.dueDate) return { days: 0, bucket: 'Not Due' };
        const today = new Date();
        const due = new Date(bill.dueDate);
        if (today <= due) {
            const isDueToday = today.toDateString() === due.toDateString();
            return { days: 0, bucket: isDueToday ? 'Due Today' : 'Not Due' };
        }
        const diffTime = Math.abs(today - due);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let bucket = 'Not Due';
        if (days <= 30) bucket = '1-30 Days';
        else if (days <= 60) bucket = '31-60 Days';
        else bucket = '60+ Days';
        return { days, bucket };
    };

    const handleMarkAsPaid = (bill) => {
        setPaymentModal({ isOpen: true, bill });
    };

    const handlePaymentSubmit = async (paymentData) => {
        try {
            await dispatch(recordPayment({
                id: paymentModal.bill._id,
                paymentData
            })).unwrap();
            toast.success('Payment recorded successfully');
            setPaymentModal({ isOpen: false, bill: null });
            dispatch(getAllBills());
            dispatch(getBillAnalytics());
        } catch (error) {
            // Check if it's an insufficient funds error
            if (error && typeof error === 'object' && error.insufficientFunds) {
                const paymentMethodLabel = error.paymentMethod === 'cash'
                    ? 'Cash'
                    : error.bankAccountName || error.paymentMethod.toUpperCase();

                const alertMessage = `
⚠️ INSUFFICIENT FUNDS

Payment Method: ${paymentMethodLabel}
Available Balance: ₹${error.available.toFixed(2)}
Payment Requested: ₹${error.requested.toFixed(2)}
Shortfall: ₹${error.shortfall.toFixed(2)}

You don't have enough funds in ${paymentMethodLabel} to complete this payment.

Options:
1. Pay partial amount (₹${error.available.toFixed(2)})
2. Select a different payment method with sufficient balance
3. Use "Owner's Personal Funds" if you paid from your personal wallet/bank
4. Use split payment (pay from multiple sources) - Coming Soon

Please try again with a different payment method or amount.
                `.trim();

                alert(alertMessage);
                // Keep modal open so user can try again
            } else {
                toast.error(error || 'Payment failed');
            }
        }
    };

    const handleApprove = async (bill) => {
        try {
            await dispatch(approveBill(bill._id)).unwrap();
            toast.success('Bill approved successfully');
            dispatch(getAllBills());
        } catch (error) {
            toast.error(error || 'Approval failed');
        }
    };

    const handleReject = () => {
        setApprovalModal({ ...approvalModal, isOpen: false });
        // You can add rejection reason modal here
        toast.info('Rejection feature - add reason modal');
    };

    const handleDelete = async (id) => {
        try {
            await dispatch(deleteBill(id)).unwrap();
            toast.success('Bill deleted successfully');
            setDeleteConfirm(null);
            dispatch(getBillAnalytics());
        } catch (error) {
            toast.error(error || 'Delete failed');
        }
    };

    const handleViewDetail = (bill) => {
        navigate(`/purchase/bills/${bill._id}`);
    };

    const columns = [
        {
            key: 'billNo',
            label: 'Bill No',
            sortable: true,
            render: (val, row) => (
                <button
                    onClick={() => handleViewDetail(row)}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                    {val}
                </button>
            )
        },
        {
            key: 'supplier',
            label: 'Supplier',
            sortable: true,
            render: (val) => val?.businessName || 'N/A'
        },
        {
            key: 'supplierInvoiceNo',
            label: 'Invoice No',
            sortable: true
        },
        {
            key: 'billDate',
            label: 'Bill Date',
            sortable: true,
            render: (val) => new Date(val).toLocaleDateString()
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            sortable: true,
            render: (val, row) => {
                if (!val) return 'N/A';
                const aging = calculateAging(row);
                const isOverdue = aging.days > 0;
                return (
                    <div className="flex flex-col">
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(val).toLocaleDateString()}
                        </span>
                        {isOverdue && (
                            <span className="text-xs text-red-500">
                                {aging.days} days overdue
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'totalAmount',
            label: 'Bill Amount',
            sortable: true,
            render: (val) => <span className="font-medium">₹{val.toFixed(2)}</span>
        },
        {
            key: 'paidAmount',
            label: 'Paid',
            render: (val) => val > 0 ?
                <span className="text-green-600 font-medium">₹{val.toFixed(2)}</span> :
                <span className="text-gray-400">₹0.00</span>
        },
        {
            key: 'outstandingAmount',
            label: 'Outstanding',
            render: (val) => val > 0 ?
                <span className="text-red-600 font-medium">₹{val.toFixed(2)}</span> :
                <span className="text-gray-400">₹0.00</span>
        },
        {
            key: 'agingBucket',
            label: 'Aging',
            render: (val, row) => {
                const aging = calculateAging(row);
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAgingColor(aging.bucket)}`}>
                        {aging.bucket}
                    </span>
                );
            }
        },
        {
            key: 'paymentStatus',
            label: 'Payment Status',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(val)}`}>
                    {val}
                </span>
            )
        },
        {
            key: 'approvalStatus',
            label: 'Approval',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getApprovalColor(val)}`}>
                    {val}
                </span>
            )
        },
        {
            key: 'purchaseNo',
            label: 'Purchase',
            render: (val, row) => row.purchase?.purchaseNo || row.purchaseNo || 'Manual'
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (val, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleViewDetail(row)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                        View
                    </button>
                    {row.approvalStatus === 'draft' && (
                        <button
                            onClick={() => handleApprove(row)}
                            className="text-green-600 hover:text-green-900 text-sm"
                        >
                            Approve
                        </button>
                    )}
                    {row.paymentStatus !== 'paid' && row.approvalStatus === 'approved' && (
                        <button
                            onClick={() => handleMarkAsPaid(row)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                            Pay
                        </button>
                    )}
                    {!row.isLocked && (
                        <button
                            onClick={() => setDeleteConfirm(row._id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                        >
                            Delete
                        </button>
                    )}
                </div>
            )
        }
    ];

    const filteredBills = bills.filter(bill => {
        const matchesSearch =
            bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bill.supplier?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bill.supplierInvoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || bill.paymentStatus === statusFilter;
        const matchesSupplier = supplierFilter === 'all' || bill.supplier?._id === supplierFilter;

        const aging = calculateAging(bill);
        const matchesAging = agingFilter === 'all' || aging.bucket === agingFilter;

        return matchesSearch && matchesStatus && matchesSupplier && matchesAging;
    });

    return (
        <Layout>
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1">Bills (Accounts Payable)</h1>
                        <p className="text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Manage supplier bills and payments</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/purchase/bills/aging')}
                            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            Aging Report
                        </button>
                        <button
                            onClick={() => navigate('/purchase/bills/new')}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            + New Bill
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {isError && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 text-sm">{message}</p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                {/* Total Bills */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{analytics?.totalBills || bills.length}</p>
                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Total Bills</p>
                        </div>
                    </div>
                </div>

                {/* Total Amount */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{(analytics?.totalBillAmount || 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Total Amount</p>
                        </div>
                    </div>
                </div>

                {/* Amount Paid */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{(analytics?.totalPaid || 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Amount Paid</p>
                        </div>
                    </div>
                </div>

                {/* Outstanding */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{(analytics?.totalOutstanding || 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Outstanding</p>
                        </div>
                    </div>
                </div>

                {/* Overdue */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{(analytics?.totalOverdue || 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Overdue</p>
                            {analytics?.overdueCount > 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400">{analytics.overdueCount} bills</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by bill no, supplier, invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:ring-2 focus:ring-indigo-500"
                        />
                        <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-[rgb(var(--color-text-secondary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    >
                        <option value="all">All Status</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>

                    <select
                        value={agingFilter}
                        onChange={(e) => setAgingFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    >
                        <option value="all">All Aging</option>
                        <option value="Not Due">Not Due</option>
                        <option value="Due Today">Due Today</option>
                        <option value="1-30 Days">1-30 Days</option>
                        <option value="31-60 Days">31-60 Days</option>
                        <option value="60+ Days">60+ Days</option>
                    </select>

                    <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    >
                        <option value="all">All Suppliers</option>
                        {suppliers.map(supplier => (
                            <option key={supplier._id} value={supplier._id}>
                                {supplier.businessName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Pagination Info and Controls - Top */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">entries</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        Showing {filteredBills.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBills.length)} of {filteredBills.length} bills
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                emptyMessage={searchTerm ? "No bills match your search" : "No bills recorded"}
                isLoading={isLoading}
            />

            {/* Pagination Controls - Bottom */}
            {filteredBills.length > itemsPerPage && (
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3 mt-4">
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded bg-white dark:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Previous
                        </button>

                        {(() => {
                            const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
                            const pages = [];
                            const maxVisible = 5;
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                            if (endPage - startPage < maxVisible - 1) {
                                startPage = Math.max(1, endPage - maxVisible + 1);
                            }

                            for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i)}
                                        className={`px-3 py-1 text-xs border rounded ${currentPage === i
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))] hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        {i}
                                    </button>
                                );
                            }
                            return pages;
                        })()}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredBills.length / itemsPerPage), prev + 1))}
                            disabled={currentPage >= Math.ceil(filteredBills.length / itemsPerPage)}
                            className="px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] rounded bg-white dark:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg p-4 max-w-md w-full mx-4 shadow-xl border dark:border-[rgb(var(--color-border))]">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-3">Confirm Delete</h3>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-4">
                            Are you sure you want to delete this bill? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {paymentModal.isOpen && paymentModal.bill && (
                <PaymentModal
                    isOpen={paymentModal.isOpen}
                    onClose={() => setPaymentModal({ isOpen: false, bill: null })}
                    onSubmit={handlePaymentSubmit}
                    documentType="Bill"
                    totalAmount={paymentModal.bill.totalAmount}
                    paidAmount={paymentModal.bill.paidAmount || 0}
                />
            )}
        </Layout>
    );
};

export default Bills;
