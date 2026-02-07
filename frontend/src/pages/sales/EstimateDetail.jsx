import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import api from '../../services/api';
import { toast } from "react-toastify";
import EstimateTemplate from "../../components/EstimateTemplate";

const EstimateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEstimate();
  }, [id]);

  const fetchEstimate = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await api.get(
        `/api/estimates/${id}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      setEstimate(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch estimate");
      navigate("/sales/estimates");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !estimate) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-[rgb(var(--color-primary))]"></div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'draft':
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header - Hidden on print */}
        <div className="mb-1 md:mb-8 print:hidden">
          <button
            onClick={() => navigate("/sales/estimates")}
            className="flex items-center text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-900 dark:hover:text-[rgb(var(--color-text))] mb-1 md:mb-4"
          >
            <svg
              className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-[10px] md:text-base">Back to Estimates</span>
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-sm md:text-2xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-2">
                Estimate Details
              </h1>
              <p className="text-[10px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">
                View and print estimate
              </p>
            </div>
            <div className="flex space-x-1 md:space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center space-x-1 md:space-x-2 px-2 py-0.5 md:px-4 md:py-2 text-xs md:text-sm bg-indigo-600 dark:bg-[rgb(var(--color-primary))] text-white rounded md:rounded-lg hover:bg-indigo-700 dark:hover:bg-[rgb(var(--color-primary-hover))]"
              >
                <svg
                  className="w-3 h-3 md:w-4 md:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Estimate Card */}
        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-xl shadow-sm p-1 md:p-6 print:shadow-none">
          {/* Estimate Header */}
          <div className="border-b pb-1 md:pb-6 mb-1 md:mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xs md:text-2xl font-bold text-indigo-600 dark:text-[rgb(var(--color-primary))] mb-0.5 md:mb-2">ESTIMATE</h2>
                <div className="text-[10px] md:text-lg font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">{estimate.estimateNo}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] md:text-sm text-gray-500 dark:text-[rgb(var(--color-text-secondary))] mb-0.5 md:mb-1">Estimate Date</div>
                <div className="text-[10px] md:text-base font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                  {new Date(estimate.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-[8px] md:text-sm text-gray-400 dark:text-[rgb(var(--color-text-muted))] mt-0.5 md:mt-1">
                  {new Date(estimate.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-8 mb-1 md:mb-8">
            <div>
              <h3 className="text-[9px] md:text-sm font-semibold text-gray-500 dark:text-[rgb(var(--color-text-muted))] uppercase mb-0.5 md:mb-2">Customer</h3>
              {estimate.customer ? (
                <div>
                  <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">{estimate.customer.name}</div>
                  <div className="text-[9px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-0.5 md:mt-1">{estimate.customer.phone}</div>
                  {estimate.customer.email && (
                    <div className="text-[9px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{estimate.customer.email}</div>
                  )}
                  {estimate.customer.address && (
                    <div className="text-[9px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mt-0.5 md:mt-1">{estimate.customer.address}</div>
                  )}
                </div>
              ) : (
                <div className="text-[9px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Walk-in Customer</div>
              )}
            </div>

            <div className="text-left md:text-right">
              <h3 className="text-[9px] md:text-sm font-semibold text-gray-500 dark:text-[rgb(var(--color-text-muted))] uppercase mb-0.5 md:mb-2">Status</h3>
              <span className={`inline-block px-1 py-0.5 md:px-2 md:py-1 rounded-full text-[8px] md:text-sm font-semibold ${getStatusColor(estimate.status)}`}>
                {estimate.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-1 md:mb-8">
            {/* Desktop Table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-[rgb(var(--color-border))]">
                  <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">#</th>
                  <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Item</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Quantity</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Price</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                    <td className="py-1.5 px-2 text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{index + 1}</td>
                    <td className="py-1.5 px-2 text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">{item.name || 'Item'}</td>
                    <td className="py-1.5 px-2 text-right text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">{item.quantity}</td>
                    <td className="py-1.5 px-2 text-right text-sm text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.price.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right text-sm font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card Layout */}
            <div className="block md:hidden">
              {estimate.items.map((item, index) => (
                <div key={index} className="py-0.5 px-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))] last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[9px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{index + 1}.</span>
                      <span className="text-[10px] font-medium text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{item.name || 'Item'}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">₹{item.total.toFixed(0)}</div>
                      <div className="text-[8px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">{item.quantity} × ₹{item.price.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-64">
              <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                <span className="text-[9px] md:text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Subtotal:</span>
                <span className="text-[10px] md:text-base font-medium text-gray-900 dark:text-[rgb(var(--color-text))]">₹{estimate.subtotal.toFixed(2)}</span>
              </div>
              {estimate.discount > 0 && (
                <div className="flex justify-between py-0.5 md:py-1 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
                  <span className="text-[9px] md:text-sm text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Discount:</span>
                  <span className="text-[10px] md:text-base font-medium text-red-600">-₹{estimate.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 md:py-1.5 border-b-2 border-gray-300 dark:border-[rgb(var(--color-border))]">
                <span className="text-xs md:text-lg font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">Total Amount:</span>
                <span className="text-xs md:text-lg font-bold text-indigo-600 dark:text-[rgb(var(--color-primary))]">
                  ₹{estimate.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="mt-1 md:mt-6 pt-1 md:pt-4 border-t border-gray-200 dark:border-[rgb(var(--color-border))]">
              <h3 className="text-[9px] md:text-sm font-semibold text-gray-500 dark:text-[rgb(var(--color-text-muted))] uppercase mb-0.5 md:mb-2">Notes</h3>
              <p className="text-[10px] md:text-base text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">{estimate.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 md:mt-12 pt-1 md:pt-6 border-t border-gray-200 dark:border-[rgb(var(--color-border))] text-center text-gray-400 dark:text-[rgb(var(--color-text-muted))] text-[9px] md:text-sm">
            <p>Thank you for your business!</p>
            <p className="mt-0.5 md:mt-2">This is a computer-generated estimate.</p>
          </div>
        </div>

        {/* Additional Info - Hidden on print */}
        <div className="mt-1 md:mt-6 bg-blue-50 dark:bg-blue-900/20 rounded md:rounded-lg p-1 md:p-2 print:hidden">
          <div className="flex items-start">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-1 md:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h4 className="text-blue-900 dark:text-blue-300 font-medium text-[10px] md:text-base mb-0.5 md:mb-1">Estimate Information</h4>
              <p className="text-blue-800 dark:text-blue-400 text-[9px] md:text-sm truncate">
                Created on {new Date(estimate.createdAt).toLocaleString('en-IN')}
              </p>
              {estimate.customer && (
                <p className="text-blue-800 dark:text-blue-400 text-[9px] md:text-sm mt-0.5 md:mt-1 truncate">
                  Customer: {estimate.customer.name} ({estimate.customer.phone})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default EstimateDetail;
