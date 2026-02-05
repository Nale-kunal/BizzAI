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

    const columns = [
        {
            key: 'receiptNumber',
            label: 'Receipt No',
            sortable: true,
            render: (val) => <span className="font-medium text-indigo-600">{val}</span>
        },
        {
            key: 'paymentDate',
            label: 'Date',
            sortable: true,
            render: (val) => new Date(val).toLocaleDateString()
        },
        {
            key: 'customer',
            label: 'Customer',
            render: (val) => (
                <div>
                    <p className="font-medium text-main">{val?.name}</p>
                    <p className="text-sm text-secondary">{val?.phone}</p>
                </div>
            )
        },
        {
            key: 'totalAmount',
            label: 'Amount',
            sortable: true,
            render: (val) => <span className="font-bold text-green-600">₹{val.toFixed(2)}</span>
        },
        {
            key: 'paymentMethods',
            label: 'Payment Methods',
            render: (val) => (
                <div className="flex flex-wrap gap-1">
                    {val.map((pm, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
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
                <div className="text-sm">
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
                <span className="text-green-600 text-sm">+₹{val.toFixed(2)}</span>
            ) : (
                <span className="text-gray-400">-</span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (val, row) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => navigate(`/sales/payment-in/${row._id}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            navigate(`/sales/payment-in/${row._id}`);
                            setTimeout(() => window.print(), 500);
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded-lg"
                        title="Print Receipt"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">
                        Payment In Records
                    </h1>
                    <p className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        View all customer payment receipts
                    </p>
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-2 mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by receipt number, customer name, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-1 border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] placeholder:text-gray-400 dark:placeholder:text-[rgb(var(--color-placeholder))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent"
                        />
                        <svg
                            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-[rgb(var(--color-text-muted))]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                            Found {filteredPayments.length} payment(s) matching "{searchQuery}"
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-[rgb(var(--color-primary))]"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))]">
                        <DataTable
                            columns={columns}
                            data={filteredPayments}
                            emptyMessage={searchQuery ? "No payments found matching your search" : "No payment records found"}
                        />
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PaymentInList;
