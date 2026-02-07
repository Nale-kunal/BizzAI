import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import api from '../../services/api';

const PurchaseReturnList = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        startDate: '',
        endDate: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
    });

    useEffect(() => {
        fetchReturns();
    }, [filters, pagination.page]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/purchase-returns', {
                params: {
                    ...filters,
                    page: pagination.page,
                    limit: pagination.limit,
                },
            });
            setReturns(response.data.returns);
            setPagination(prev => ({
                ...prev,
                ...response.data.pagination,
            }));
        } catch (err) {
            console.error('Error fetching returns:', err);
            toast.error('Failed to fetch purchase returns');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
            pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        };
        return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this return?')) return;

        try {
            await api.delete(`/api/purchase-returns/${id}`);
            toast.success('Purchase return deleted successfully');
            fetchReturns();
        } catch (err) {
            console.error('Error deleting return:', err);
            toast.error(err.response?.data?.message || 'Failed to delete return');
        }
    };

    return (
        <Layout>
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/purchase/return')}
                    className="flex items-center text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-900 dark:hover:text-[rgb(var(--color-text))] mb-4"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-base">Back to Purchase Return</span>
                </button>
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1">Purchase Returns</h1>
                            <p className="text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Manage purchase returns and refunds</p>
                        </div>
                        <button
                            onClick={() => navigate('/purchase/return')}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            + Create Return
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Total Returns */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{pagination?.total || 0}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Total Returns</p>
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
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{returns.reduce((sum, ret) => sum + (ret.totalAmount || 0), 0).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Total Amount</p>
                            </div>
                        </div>
                    </div>

                    {/* Completed */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{returns.filter(ret => ret.status === 'completed' || ret.status === 'approved').length}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Pending */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{returns.filter(ret => ret.status === 'draft' || ret.status === 'pending_approval' || ret.status === 'processing').length}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Pending</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Search by return ID..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="pending_approval">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Returns Table */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">Loading...</p>
                        </div>
                    ) : returns.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">No purchase returns found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Return ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Supplier</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Items</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Amount</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[rgb(var(--color-card))] divide-y divide-gray-200 dark:divide-gray-700">
                                    {returns.map((returnItem) => (
                                        <tr key={returnItem._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => navigate(`/purchase/returns/${returnItem._id}`)}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                                >
                                                    {returnItem.returnId}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                {new Date(returnItem.returnDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                {returnItem.supplier?.businessName}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                {returnItem.items?.length || 0}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                ₹{returnItem.totalAmount?.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(returnItem.status)}`}>
                                                    {returnItem.status?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => navigate(`/purchase/returns/${returnItem._id}`)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                        title="View Details"
                                                    >
                                                        View
                                                    </button>
                                                    {returnItem.status === 'draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/purchase/returns/${returnItem._id}/edit`)}
                                                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                                                title="Edit"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(returnItem._id)}
                                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                                title="Delete"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <p className="text-xs text-gray-700 dark:text-[rgb(var(--color-text-secondary))]">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                            </p>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text-secondary))] disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page === pagination.pages}
                                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-700 dark:text-[rgb(var(--color-text-secondary))] disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default PurchaseReturnList;
