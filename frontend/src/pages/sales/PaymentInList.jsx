import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const PaymentInList = () => {
    const navigate = useNavigate();

    // Get token from user object in localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.token;

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await api.get(`${API_URL}/api/payment-in`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayments(response.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to fetch payment records');
        } finally {
            setLoading(false);
        }
    };

    // Filter payments based on search query
    const filteredPayments = payments.filter(payment => {
        const query = searchQuery.toLowerCase();
        return (
            payment.receiptNumber.toLowerCase().includes(query) ||
            payment.customer?.name?.toLowerCase().includes(query) ||
            payment.customer?.phone?.includes(query)
        );
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const columns = [
        {
            key: 'receiptNumber',
            label: 'Receipt No',
            sortable: true,
            render: (val) => <span className="text-[9px] md:text-sm font-medium text-indigo-600">{val}</span>
        },
        {
            key: 'paymentDate',
            label: 'Date',
            sortable: true,
            render: (val) => <span className="text-[9px] md:text-sm">{new Date(val).toLocaleDateString()}</span>
        },
        {
            key: 'customer',
            label: 'Customer',
            render: (val) => (
                <div>
                    <p className="text-[9px] md:text-sm font-medium text-main">{val?.name}</p>
                    <p className="text-[8px] md:text-xs text-secondary">{val?.phone}</p>
                </div>
            )
        },
        {
            key: 'totalAmount',
            label: 'Amount',
            sortable: true,
            render: (val) => <span className="text-[9px] md:text-sm font-bold text-green-600">₹{val.toFixed(2)}</span>
        },
        {
            key: 'paymentMethods',
            label: 'Payment Methods',
            render: (val) => (
                <div className="flex flex-wrap gap-0.5 md:gap-1">
                    {val.map((pm, idx) => (
                        <span key={idx} className="px-1 py-0.5 md:px-2 md:py-1 bg-blue-100 text-blue-700 text-[8px] md:text-xs rounded">
                            {pm.method.toUpperCase()}: ₹{pm.amount.toFixed(2)}
                        </span>
                    ))}
                </div>
            )
        },
        {
            key: 'allocatedInvoices',
            label: 'Invoices',
            render: (val) => (
                <div className="text-[9px] md:text-sm">
                    {val.length > 0 ? (
                        <span className="text-secondary">{val.length} invoice(s)</span>
                    ) : (
                        <span className="text-orange-600">Advance Payment</span>
                    )}
                </div>
            )
        },
        {
            key: 'excessAmount',
            label: 'Excess/Credit',
            render: (val) => val > 0 ? (
                <span className="text-green-600 text-[9px] md:text-sm">+₹{val.toFixed(2)}</span>
            ) : (
                <span className="text-gray-400">-</span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (val, row) => (
                <div className="flex items-center space-x-1 md:space-x-2">
                    <button
                        onClick={() => navigate(`/sales/payment-in/${row._id}`)}
                        className="p-0.5 md:p-1 text-blue-600 hover:bg-blue-50 rounded md:rounded-lg"
                        title="View Details"
                    >
                        <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            navigate(`/sales/payment-in/${row._id}`);
                            setTimeout(() => window.print(), 500);
                        }}
                        className="p-0.5 md:p-1 text-gray-600 hover:bg-gray-50 rounded md:rounded-lg"
                        title="Print Receipt"
                    >
                        <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </button>
                </div>
            )
        }
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-1 md:mb-8">
                    <button
                        onClick={() => navigate('/sales/payment-in')}
                        className="flex items-center text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-900 dark:hover:text-[rgb(var(--color-text))] mb-1 md:mb-4"
                    >
                        <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-[10px] md:text-base">Back to Payment In</span>
                    </button>
                    <h1 className="text-sm md:text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-2">
                        Payment In Records
                    </h1>
                    <p className="text-[10px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        View all customer payment receipts
                    </p>
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-1 md:p-2 mb-1 md:mb-6">
                    <div className="flex flex-row justify-between items-center gap-2 md:gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by receipt number, customer name, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-6 md:pl-10 pr-4 py-0.5 md:py-1 text-[9px] md:text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] placeholder:text-gray-400 dark:placeholder:text-[rgb(var(--color-placeholder))] rounded md:rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent"
                                />
                                <svg
                                    className="absolute left-1 md:left-3 top-1 md:top-2.5 w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-[rgb(var(--color-text-muted))]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-1 md:right-3 top-1 md:top-2.5 text-gray-400 hover:text-gray-600">
                                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center flex-shrink-0">
                            <select
                                className="px-1 md:px-2 py-0.5 md:py-1 text-[9px] md:text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] rounded md:rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                            </select>
                        </div>
                    </div>
                    {searchQuery && (
                        <p className="mt-0.5 md:mt-1 text-[8px] md:text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                            Found {filteredPayments.length} payment(s) matching "{searchQuery}"
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-32 md:h-64">
                        <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-indigo-600 dark:border-[rgb(var(--color-primary))]"></div>
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))]">
                            <DataTable
                                columns={columns}
                                data={paginatedPayments}
                                emptyMessage={searchQuery ? "No payments found matching your search" : "No payment records found"}
                            />
                        </div>

                        {/* Pagination Controls */}
                        {filteredPayments.length > 0 && (
                            <div className="mt-1 md:mt-4 flex flex-row items-center justify-between bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-0.5 md:p-4 gap-1 md:gap-0">
                                <div className="text-[8px] md:text-sm text-gray-700 dark:text-[rgb(var(--color-text-secondary))] whitespace-nowrap">
                                    <span className="hidden md:inline">Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments</span>
                                    <span className="md:hidden">{startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length}</span>
                                </div>
                                <div className="flex items-center space-x-0.5 md:space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-1 py-0.5 md:px-3 md:py-1 text-[8px] md:text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded md:rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))]"
                                    >
                                        <span className="hidden md:inline">Previous</span>
                                        <span className="md:hidden">‹</span>
                                    </button>
                                    <div className="flex items-center space-x-0.5 md:space-x-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(page => {
                                                // Show first page, last page, current page, and pages around current
                                                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                            })
                                            .map((page, index, array) => (
                                                <div key={page} className="flex items-center">
                                                    {index > 0 && array[index - 1] !== page - 1 && (
                                                        <span className="px-0.5 md:px-2 text-[8px] md:text-sm text-gray-400">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-1 py-0.5 md:px-3 md:py-1 text-[8px] md:text-sm border rounded md:rounded-lg ${currentPage === page
                                                            ? 'bg-indigo-600 dark:bg-[rgb(var(--color-primary))] text-white border-indigo-600 dark:border-[rgb(var(--color-primary))]'
                                                            : 'border-gray-300 dark:border-[rgb(var(--color-border))] hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))]'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-1 py-0.5 md:px-3 md:py-1 text-[8px] md:text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded md:rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text))]"
                                    >
                                        <span className="hidden md:inline">Next</span>
                                        <span className="md:hidden">›</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default PaymentInList;
