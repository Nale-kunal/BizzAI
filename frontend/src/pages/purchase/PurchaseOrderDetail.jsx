import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPurchaseOrderById,
    convertToPurchase,
    reset,
} from "../../redux/slices/purchaseOrderSlice";
import { toast } from "react-toastify";
import { FiArrowLeft, FiEdit, FiFileText, FiPackage } from "react-icons/fi";
import Layout from "../../components/Layout";

const PurchaseOrderDetail = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { currentPO, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.purchaseOrder
    );

    useEffect(() => {
        dispatch(getPurchaseOrderById(id));
    }, [dispatch, id]);

    useEffect(() => {
        if (isError) {
            toast.error(message);
            dispatch(reset());
        }
        if (isSuccess && message) {
            toast.success(message);
            dispatch(reset());
        }
    }, [isError, isSuccess, message, dispatch]);

    const handleConvertToPurchase = async () => {
        if (window.confirm("Convert this PO to Purchase?")) {
            await dispatch(convertToPurchase(id));
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            Draft: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
            "Pending Approval": "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            Approved: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
            "Partially Received": "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            "Fully Received": "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
            Closed: "bg-gray-400 text-white dark:bg-gray-600",
            Cancelled: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-200 dark:bg-gray-700"}`}>
                {status}
            </span>
        );
    };

    if (isLoading) {
        return <div className="container mx-auto px-4 py-4 text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Loading...</div>;
    }

    if (!currentPO) {
        return <div className="container mx-auto px-4 py-4 text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Purchase Order not found</div>;
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/purchase-orders")}
                            className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-800 dark:hover:text-[rgb(var(--color-text))]"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 dark:text-[rgb(var(--color-text))]">{currentPO.poNumber}</h1>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Purchase Order Details</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {currentPO.status === "Draft" && (
                            <button
                                onClick={() => navigate(`/purchase-orders/${id}/edit`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                            >
                                <FiEdit size={14} /> Edit
                            </button>
                        )}
                        {currentPO.status === "Approved" && !currentPO.convertedToPurchase && (
                            <button
                                onClick={handleConvertToPurchase}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                            >
                                <FiFileText size={14} /> Convert to Purchase
                            </button>
                        )}
                        {(currentPO.status === "Approved" || currentPO.status === "Partially Received") && (
                            <button
                                onClick={() => navigate(`/grns/new?po=${id}`)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-sm rounded-lg"
                            >
                                Create GRN
                            </button>
                        )}
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Status</p>
                            <div className="mt-1">{getStatusBadge(currentPO.status)}</div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">PO Date</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{new Date(currentPO.poDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Expected Delivery</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">
                                {new Date(currentPO.expectedDeliveryDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Supplier</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{currentPO.supplier?.businessName || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total Amount</p>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">₹{currentPO.totalAmount?.toLocaleString()}</p>
                        </div>
                        {currentPO.warehouse && (
                            <div>
                                <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Warehouse</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{currentPO.warehouse}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                    <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Items</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Item</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Ordered</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Received</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Pending</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Rate</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Discount</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Tax</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[rgb(var(--color-card))] divide-y divide-gray-200 dark:divide-gray-700">
                                {currentPO.items?.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.itemName}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.orderedQty}</td>
                                        <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400">{item.receivedQty}</td>
                                        <td className="px-3 py-2 text-xs text-orange-600 dark:text-orange-400">{item.pendingQty}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.rate}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.discount}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-[rgb(var(--color-text))]">{item.taxRate}%</td>
                                        <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.total?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                    <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Financial Summary</h2>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Subtotal:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.subtotal?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Item Discount:</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">-₹{currentPO.itemDiscount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Bill Discount:</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">-₹{currentPO.billDiscount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">CGST:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.totalCGST?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">SGST:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.totalSGST?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">IGST:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.totalIGST?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Shipping Charges:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.shippingCharges?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Packing Charges:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.packingCharges?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Other Charges:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.otherCharges?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">TDS:</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">-₹{currentPO.tdsAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Round Off:</span>
                            <span className="font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{currentPO.roundOff?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t dark:border-gray-700 pt-2 mt-2">
                            <span className="text-gray-900 dark:text-[rgb(var(--color-text))]">Total Amount:</span>
                            <span className="text-blue-600 dark:text-blue-400">₹{currentPO.totalAmount?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Approval History */}
                {currentPO.approvalHistory && currentPO.approvalHistory.length > 0 && (
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Approval History</h2>
                        <div className="space-y-2">
                            {currentPO.approvalHistory.map((approval, index) => (
                                <div key={index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 py-1.5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{approval.approverName}</p>
                                            <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] capitalize">{approval.action}</p>
                                            {approval.comments && (
                                                <p className="text-xs text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mt-0.5">{approval.comments}</p>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                            {new Date(approval.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* GRNs */}
                {currentPO.grns && currentPO.grns.length > 0 && (
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Goods Received Notes</h2>
                        <div className="space-y-1.5">
                            {currentPO.grns.map((grn, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-xs font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">{grn.grnNumber || grn._id}</span>
                                    <button
                                        onClick={() => navigate(`/grns/${grn._id}`)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                                    >
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {(currentPO.notes || currentPO.termsAndConditions) && (
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4 mb-4">
                        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Notes & Terms</h2>
                        {currentPO.notes && (
                            <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))]">Notes:</p>
                                <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-1">{currentPO.notes}</p>
                            </div>
                        )}
                        {currentPO.termsAndConditions && (
                            <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))]">Terms & Conditions:</p>
                                <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-1">{currentPO.termsAndConditions}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Audit Trail */}
                {currentPO.auditLog && currentPO.auditLog.length > 0 && (
                    <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm dark:shadow-lg border dark:border-[rgb(var(--color-border))] p-4">
                        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-[rgb(var(--color-text))]">Audit Trail</h2>
                        <div className="space-y-1.5">
                            {currentPO.auditLog.map((log, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-medium capitalize text-gray-900 dark:text-[rgb(var(--color-text))]">{log.action}</span>
                                        <span className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{" "}by {log.performedByName}</span>
                                        {log.details && <span className="text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{" "}- {log.details}</span>}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PurchaseOrderDetail;
