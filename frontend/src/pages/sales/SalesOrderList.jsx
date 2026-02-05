import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';

const SalesOrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        overdue: false
    });

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = user?.token;
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.overdue) params.append('overdue', 'true');

            const response = await api.get(
                `/api/sales-orders?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            let fetchedOrders = response.data;

            // Apply search filter on frontend
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                fetchedOrders = fetchedOrders.filter(order =>
                    order.orderNumber.toLowerCase().includes(searchLower) ||
                    order.customer?.name.toLowerCase().includes(searchLower)
                );
            }

            setOrders(fetchedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to fetch sales orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Draft': 'bg-gray-100 text-gray-800',
            'Confirmed': 'bg-blue-100 text-blue-800',
            'Partially Delivered': 'bg-purple-100 text-purple-800',
            'Delivered': 'bg-indigo-100 text-indigo-800',
            'Partially Invoiced': 'bg-yellow-100 text-yellow-800',
            'Invoiced': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const isOverdue = (order) => {
        if (order.status === 'Invoiced' || order.status === 'Cancelled') return false;
        const expectedDate = new Date(order.expectedDeliveryDate);
        const now = new Date();
        return expectedDate < now;
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2">
                        Sales Orders
                    </h1>
                    <p className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                        View and manage all sales orders
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mt-1">{orders.length}</p>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Confirmed Orders</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mt-1">
                                    {orders.filter(o => o.status === 'Confirmed' || o.status === 'Partially Delivered' || o.status === 'Delivered').length}
                                </p>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mt-1">
                                    ₹{orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(0)}
                                </p>
                            </div>
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Overdue Orders</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mt-1">
                                    {orders.filter(o => isOverdue(o)).length}
                                </p>
                            </div>
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-xl shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">Search</label>
                            <input
                                type="text"
                                placeholder="Order No or Customer..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))]"
                            >
                                <option value="">All Status</option>
                                <option value="Draft">Draft</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Partially Delivered">Partially Delivered</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Partially Invoiced">Partially Invoiced</option>
                                <option value="Invoiced">Invoiced</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.overdue}
                                    onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))]">Show Overdue Only</span>
                            </label>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ status: '', search: '', overdue: false })}
                                className="px-3 py-1 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] text-gray-700 dark:text-[rgb(var(--color-text-secondary))] rounded-lg hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-surface))]"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Orders Table */}
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-[rgb(var(--color-primary))]"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                            No sales orders found. Create your first order!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-[rgb(var(--color-table-header))] border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Order No</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Customer</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Order Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Expected Delivery</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Total Amount</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[rgb(var(--color-table-row))] divide-y divide-gray-200 dark:divide-[rgb(var(--color-border))]">
                                    {orders.map((order) => (
                                        <tr
                                            key={order._id}
                                            className="hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-surface))] cursor-pointer"
                                            onClick={() => navigate(`/sales/sales-order/${order._id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="text-xs font-medium text-indigo-600 dark:text-[rgb(var(--color-primary))]">{order.orderNumber}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{order.customer?.name || 'N/A'}</div>
                                                <div className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{order.customer?.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                                                {new Date(order.orderDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                                                </div>
                                                {isOverdue(order) && (
                                                    <span className="text-xs text-red-600 font-medium">OVERDUE</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                ₹{order.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/sales/sales-order/${order._id}`);

                                                    }}
                                                    className="text-xs text-indigo-600 dark:text-[rgb(var(--color-primary))] hover:text-indigo-700 font-medium"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default SalesOrderList;
