import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { toast } from 'react-toastify';

const EstimateList = () => {
    const navigate = useNavigate();
    const [estimates, setEstimates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEstimates();
    }, []);

    const fetchEstimates = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await api.get(
                `/api/estimates`,
                {
                    headers: { Authorization: `Bearer ${user.token}` }
                }
            );
            setEstimates(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch estimates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this estimate?')) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await api.delete(
                `/api/estimates/${id}`,
                {
                    headers: { Authorization: `Bearer ${user.token}` }
                }
            );
            toast.success('Estimate deleted');
            fetchEstimates();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete estimate');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
            case 'sent':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
            case 'accepted':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
            case 'rejected':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
        }
    };

    const filteredEstimates = estimates.filter((est) =>
        est.estimateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-[rgb(var(--color-primary))]"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">
                        Estimates / Proforma
                    </h1>
                    <p className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        View and manage all estimates
                    </p>
                </div>

                {/* Search */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-2 mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by estimate number or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1 border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] placeholder:text-gray-400 dark:placeholder:text-[rgb(var(--color-placeholder))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent"
                        />
                        <svg
                            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-[rgb(var(--color-text-muted))]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Estimates Table */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-[rgb(var(--color-table-header))] border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Estimate #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[rgb(var(--color-table-row))] divide-y divide-gray-200 dark:divide-[rgb(var(--color-border))]">
                                {filteredEstimates.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-12">
                                            <svg
                                                className="w-16 h-16 text-gray-400 dark:text-[rgb(var(--color-text-muted))] mx-auto mb-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <p className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))] text-lg">
                                                No estimates found
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEstimates.map((estimate) => (
                                        <tr key={estimate._id} className="hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-table-row-hover))]">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-medium text-indigo-600 dark:text-[rgb(var(--color-primary))]">
                                                    {estimate.estimateNo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                    {estimate.customer?.name || 'Walk-in Customer'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                    {new Date(estimate.createdAt).toLocaleDateString('en-IN')}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {new Date(estimate.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                    ₹{estimate.totalAmount.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(estimate.status)}`}>
                                                    {estimate.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                                                <button
                                                    onClick={() => navigate(`/sales/estimate/${estimate._id}`)}
                                                    className="text-indigo-600 dark:text-[rgb(var(--color-primary))] hover:text-indigo-900 dark:hover:text-[rgb(var(--color-primary-hover))] mr-4">
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(estimate._id)}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-500">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EstimateList;
