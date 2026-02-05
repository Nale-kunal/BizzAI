import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getAllGRNs, finalizeGRN, setFilters, clearFilters, setPagination, reset } from "../../redux/slices/grnSlice";
import { toast } from "react-toastify";
import { FiEye, FiCheck, FiPlus } from "react-icons/fi";
import Layout from "../../components/Layout";

const GRNList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { grns, filters, pagination, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.grn
    );

    useEffect(() => {
        dispatch(getAllGRNs({ ...filters, ...pagination }));
    }, [dispatch, filters, pagination.page]);

    useEffect(() => {
        if (isError) {
            toast.error(message);
            dispatch(reset());
        }
        if (isSuccess && message) {
            toast.success(message);
            dispatch(reset());
            dispatch(getAllGRNs({ ...filters, ...pagination }));
        }
    }, [isError, isSuccess, message, dispatch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        dispatch(setFilters({ [name]: value }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        dispatch(setPagination({ page: 1 }));
        dispatch(getAllGRNs({ ...filters, page: 1, limit: pagination.limit }));
    };

    const handleClearFilters = () => {
        dispatch(clearFilters());
        dispatch(setPagination({ page: 1 }));
    };

    const handlePageChange = (newPage) => {
        dispatch(setPagination({ page: newPage }));
    };

    const handleFinalize = async (id) => {
        if (window.confirm("Finalize this GRN? This will update inventory and cannot be undone.")) {
            await dispatch(finalizeGRN(id));
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            Draft: "bg-gray-200 text-gray-800",
            Finalized: "bg-green-200 text-green-800",
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-200"}`}>
                {status}
            </span>
        );
    };

    return (
        <Layout>
            <div className="space-y-4">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1">Goods Received Notes</h1>
                            <p className="text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Track and manage goods received</p>
                        </div>
                        <button
                            onClick={() => navigate("/grns/new")}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                        >
                            <FiPlus /> New GRN
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* Total GRNs */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{pagination?.total || 0}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Total GRNs</p>
                            </div>
                        </div>
                    </div>

                    {/* Finalized */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{grns.filter(grn => grn.status === 'Finalized').length}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Finalized</p>
                            </div>
                        </div>
                    </div>

                    {/* Draft */}
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg p-4 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-full">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{grns.filter(grn => grn.status === 'Draft').length}</p>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide">Draft</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-3 mb-4">
                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">Status</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Finalized">Finalized</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={filters.startDate}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1">End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-md bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                            >
                                Apply Filters
                            </button>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] overflow-hidden">
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Loading...</div>
                    ) : grns.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">No GRNs found</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                GRN Number
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                PO Number
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                Supplier
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                Received By
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[rgb(var(--color-card))] divide-y divide-gray-200 dark:divide-gray-700">
                                        {grns.map((grn) => (
                                            <tr key={grn._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                                                    {grn.grnNumber}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {new Date(grn.grnDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {grn.purchaseOrder?.poNumber || "N/A"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {grn.supplier?.businessName || "N/A"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                                    {grn.receivedBy}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(grn.status)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => navigate(`/grns/${grn._id}`)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                                            title="View"
                                                        >
                                                            <FiEye />
                                                        </button>

                                                        {grn.status === "Draft" && (
                                                            <button
                                                                onClick={() => handleFinalize(grn._id)}
                                                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                                                title="Finalize"
                                                            >
                                                                <FiCheck />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="bg-white dark:bg-[rgb(var(--color-card))] px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs text-gray-700 dark:text-[rgb(var(--color-text-secondary))]">
                                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                                            <span className="font-medium">
                                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                                            </span>{" "}
                                            of <span className="font-medium">{pagination.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                                className="relative inline-flex items-center px-2 py-1 text-xs rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[rgb(var(--color-input))] font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            {[...Array(pagination.pages)].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => handlePageChange(i + 1)}
                                                    className={`relative inline-flex items-center px-3 py-1 border text-xs font-medium ${pagination.page === i + 1
                                                        ? "z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-300"
                                                        : "bg-white dark:bg-[rgb(var(--color-input))] border-gray-300 dark:border-gray-600 text-gray-500 dark:text-[rgb(var(--color-text-secondary))] hover:bg-gray-50 dark:hover:bg-gray-700"
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page >= pagination.pages}
                                                className="relative inline-flex items-center px-2 py-1 text-xs rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[rgb(var(--color-input))] font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default GRNList;
