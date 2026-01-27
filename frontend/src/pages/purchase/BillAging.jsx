import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import StatsCard from '../../components/StatsCard';
import { getBillAging, reset } from '../../redux/slices/billSlice';

const BillAging = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { aging, isLoading } = useSelector(state => state.bill);
    const [selectedBucket, setSelectedBucket] = useState('all');

    useEffect(() => {
        dispatch(getBillAging());
        return () => {
            dispatch(reset());
        };
    }, [dispatch]);

    const agingBuckets = [
        { key: 'notDue', label: 'Not Due', color: 'blue' },
        { key: 'dueToday', label: 'Due Today', color: 'orange' },
        { key: '1-30Days', label: '1-30 Days Overdue', color: 'yellow' },
        { key: '31-60Days', label: '31-60 Days Overdue', color: 'red' },
        { key: '60PlusDays', label: '60+ Days Overdue', color: 'red' }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'bg-blue-500' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'bg-orange-500' },
            yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'bg-yellow-500' },
            red: { bg: 'bg-red-100', text: 'text-red-800', icon: 'bg-red-500' }
        };
        return colors[color] || colors.blue;
    };

    const handleExport = () => {
        // Prepare CSV data
        const csvData = [];
        csvData.push(['Aging Report - Bills']);
        csvData.push(['Generated on:', new Date().toLocaleString()]);
        csvData.push([]);
        csvData.push(['Summary']);
        csvData.push(['Aging Bucket', 'Count', 'Amount']);

        agingBuckets.forEach(bucket => {
            const data = aging?.[bucket.key];
            if (data) {
                csvData.push([bucket.label, data.count, `₹${data.amount.toFixed(2)}`]);
            }
        });

        csvData.push([]);
        csvData.push(['Detailed Bills']);
        csvData.push(['Bill No', 'Supplier', 'Due Date', 'Outstanding', 'Days Overdue']);

        agingBuckets.forEach(bucket => {
            const data = aging?.[bucket.key];
            if (data && data.bills) {
                data.bills.forEach(bill => {
                    csvData.push([
                        bill.billNo,
                        bill.supplier?.businessName || 'N/A',
                        bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A',
                        `₹${bill.outstanding.toFixed(2)}`,
                        bill.daysOverdue || 0
                    ]);
                });
            }
        });

        // Convert to CSV string
        const csvContent = csvData.map(row => row.join(',')).join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-aging-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading aging report...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    const totalOutstanding = agingBuckets.reduce((sum, bucket) => {
        return sum + (aging?.[bucket.key]?.amount || 0);
    }, 0);

    const totalBills = agingBuckets.reduce((sum, bucket) => {
        return sum + (aging?.[bucket.key]?.count || 0);
    }, 0);

    const filteredBills = selectedBucket === 'all'
        ? agingBuckets.flatMap(bucket => aging?.[bucket.key]?.bills || [])
        : aging?.[selectedBucket]?.bills || [];

    return (
        <Layout>
            <PageHeader
                title="Bill Aging Report"
                description="Accounts Payable aging analysis"
                actions={[
                    <button
                        key="export"
                        onClick={handleExport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Export to CSV
                    </button>,
                    <button
                        key="back"
                        onClick={() => navigate('/purchase/bills')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        ← Back to Bills
                    </button>
                ]}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <StatsCard
                    title="Total Outstanding Bills"
                    value={totalBills}
                    subtitle={`₹${totalOutstanding.toFixed(2)}`}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    iconBgColor="bg-indigo-100"
                    iconColor="text-indigo-600"
                />
                <StatsCard
                    title="Overdue Amount"
                    value={`₹${((aging?.['1-30Days']?.amount || 0) + (aging?.['31-60Days']?.amount || 0) + (aging?.['60PlusDays']?.amount || 0)).toFixed(2)}`}
                    subtitle={`${(aging?.['1-30Days']?.count || 0) + (aging?.['31-60Days']?.count || 0) + (aging?.['60PlusDays']?.count || 0)} bills`}
                    icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    iconBgColor="bg-red-100"
                    iconColor="text-red-600"
                />
            </div>

            {/* Aging Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {agingBuckets.map(bucket => {
                    const data = aging?.[bucket.key];
                    const colors = getColorClasses(bucket.color);
                    return (
                        <div
                            key={bucket.key}
                            onClick={() => setSelectedBucket(bucket.key)}
                            className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${selectedBucket === bucket.key ? 'ring-2 ring-indigo-500' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                                    {bucket.label}
                                </span>
                            </div>
                            <div className="mt-2">
                                <p className="text-2xl font-bold">{data?.count || 0}</p>
                                <p className="text-sm text-gray-600">₹{(data?.amount || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Filter by Bucket:</label>
                    <select
                        value={selectedBucket}
                        onChange={(e) => setSelectedBucket(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Buckets</option>
                        {agingBuckets.map(bucket => (
                            <option key={bucket.key} value={bucket.key}>{bucket.label}</option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-600">
                        Showing {filteredBills.length} bills
                    </span>
                </div>
            </div>

            {/* Bills Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bill No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Due Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Amount
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Outstanding
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Days Overdue
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No bills in this aging bucket
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => (
                                    <tr key={bill._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => navigate(`/purchase/bills/${bill._id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                                            >
                                                {bill.billNo}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {bill.supplier?.businessName || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            ₹{bill.totalAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-red-600">
                                            ₹{bill.outstanding.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {bill.daysOverdue > 0 ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                                    {bill.daysOverdue} days
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => navigate(`/purchase/bills/${bill._id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Total Bills</p>
                        <p className="text-3xl font-bold text-gray-900">{filteredBills.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                        <p className="text-3xl font-bold text-red-600">
                            ₹{filteredBills.reduce((sum, bill) => sum + bill.outstanding, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Average Days Overdue</p>
                        <p className="text-3xl font-bold text-orange-600">
                            {filteredBills.length > 0
                                ? Math.round(filteredBills.reduce((sum, bill) => sum + (bill.daysOverdue || 0), 0) / filteredBills.length)
                                : 0
                            }
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default BillAging;
