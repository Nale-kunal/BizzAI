import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Layout from "../components/Layout";
import { getAllExpenses } from "../redux/slices/expenseSlice";
import { getAllBills } from "../redux/slices/billSlice";
import { getDashboardStats } from "../redux/slices/reportsSlice";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { expenses = [] } = useSelector((state) => state.expense);
  const { bills = [] } = useSelector((state) => state.bill);
  const { dashboardStats } = useSelector((state) => state.reports);
  const [fadeIn, setFadeIn] = useState(false);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detect window resize for responsive charts
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      dispatch(getAllExpenses());
      dispatch(getAllBills());
      dispatch(getDashboardStats());
      // Trigger fade-in animation
      setTimeout(() => setFadeIn(true), 50);
    }
  }, [user, navigate, dispatch]);

  if (!user) {
    return null;
  }

  // Calculate expense metrics - with safety checks
  const totalExpenses = Array.isArray(expenses)
    ? expenses.reduce((sum, exp) => sum + exp.amount, 0)
    : 0;
  const thisMonthExpenses = Array.isArray(expenses)
    ? expenses
      .filter((exp) => {
        const expenseDate = new Date(exp.date);
        const now = new Date();
        return (
          expenseDate.getMonth() === now.getMonth() &&
          expenseDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, exp) => sum + exp.amount, 0)
    : 0;

  // Calculate bill metrics - with safety checks
  const totalBillsAmount = Array.isArray(bills)
    ? bills.reduce((sum, bill) => sum + bill.amount, 0)
    : 0;
  const totalOutstanding = Array.isArray(bills)
    ? bills
      .filter((bill) => bill.status === "unpaid")
      .reduce((sum, bill) => sum + bill.amount, 0)
    : 0;

  return (
    <Layout>
      <div
        className={`p-1.5 md:p-0 transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"
          }`}
      >
        {/* Welcome Section - Desktop */}
        <div className="hidden md:block bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-[rgb(var(--color-primary))] dark:to-[rgb(var(--color-primary-hover))] rounded-lg p-2 mb-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold mb-0.5 leading-tight">
                Welcome back, {user?.user?.name || user?.name || "User"}!
              </h2>
              <p className="text-[10px] text-indigo-100 dark:text-white/80 leading-tight">
                Account overview and business insights
              </p>
            </div>
            <button
              onClick={() => navigate("/profile-settings")}
              className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] bg-white hover:bg-gray-100 dark:bg-white/10 dark:hover:bg-white/20 text-indigo-600 dark:text-white rounded-md transition-colors duration-150 font-medium whitespace-nowrap"
              title="Edit Profile"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Mobile Header - Compact App Style */}
        <div className="md:hidden bg-white dark:bg-[rgb(var(--color-card))] border-b dark:border-[rgb(var(--color-border))] h-12 flex items-center justify-between px-3 mb-2">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--color-text))]">
            {user?.user?.shopName || user?.shopName || "Dashboard"}
          </h1>
          <button
            onClick={() => navigate("/profile-settings")}
            className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[rgb(var(--color-primary))] dark:to-[rgb(var(--color-primary-hover))] rounded-full flex items-center justify-center"
          >
            <span className="text-sm font-bold text-white">
              {(user?.user?.name || user?.name || "U").charAt(0).toUpperCase()}
            </span>
          </button>
        </div>

        {/* Profile Card - Mobile Compact */}
        <div className="md:hidden flex flex-col gap-0.5 p-1 bg-white dark:bg-[rgb(var(--color-card))] rounded border dark:border-[rgb(var(--color-border))] mb-1.5 overflow-hidden">
          {/* Row 1: Avatar + Name + Role + Shop */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[rgb(var(--color-primary))] dark:to-[rgb(var(--color-primary-hover))] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {(user?.user?.name || user?.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] truncate leading-none mb-0.5">
                {user?.user?.name || user?.name || "User"}
              </h3>
              <p className="text-[9px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] truncate leading-none">
                {user?.user?.role || user?.role || "Owner"} • {user?.user?.shopName || user?.shopName || "Shop"}
              </p>
            </div>
          </div>
          {/* Row 2: Email + Phone */}
          <div className="text-[9px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] truncate leading-none pl-7">
            {user?.user?.email || user?.email || ""} • {user?.user?.phone || user?.phone || ""}
          </div>
        </div>

        {/* Profile Card - Desktop */}
        <div className="hidden md:block bg-white dark:bg-[rgb(var(--color-card))] rounded-md shadow-sm dark:shadow-lg p-2 mb-3 border dark:border-[rgb(var(--color-border))]">
          <div className="flex items-center space-x-2 pb-1.5 border-b border-gray-200 dark:border-[rgb(var(--color-border))]">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[rgb(var(--color-primary))] dark:to-[rgb(var(--color-primary-hover))] rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {(user?.user?.name || user?.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] truncate">
                {user?.user?.name || user?.name || "User"}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] truncate">
                {user?.user?.email || user?.email || ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
            {/* Email */}
            <div className="flex items-start space-x-1.5 p-1 rounded-md bg-white dark:bg-[rgb(var(--color-card))] border dark:border-[rgb(var(--color-border))]">
              <div className="p-0.5 bg-blue-600 rounded">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                  Email
                </p>
                <p className="text-[10px] text-gray-900 dark:text-[rgb(var(--color-text))] font-medium">
                  {user?.user?.email || user?.email || "Not provided"}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start space-x-1.5 p-1 rounded-md bg-white dark:bg-[rgb(var(--color-card))] border dark:border-[rgb(var(--color-border))]">
              <div className="p-0.5 bg-purple-600 rounded">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-gray-900 dark:text-[rgb(var(--color-text))] font-semibold text-[10px] truncate">
                  {user?.user?.phone || user?.phone || "Not provided"}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start space-x-1.5 p-1 rounded-md bg-white dark:bg-[rgb(var(--color-card))] border dark:border-[rgb(var(--color-border))]">
              <div className="p-0.5 bg-yellow-600 rounded">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
                  Role
                </p>
                <p className="text-gray-900 dark:text-[rgb(var(--color-text))] font-semibold text-[10px] capitalize truncate">
                  {user?.user?.role || user?.role || "Owner"}
                </p>
              </div>
            </div>

            {/* Shop Name */}
            <div className="flex items-start space-x-1.5 p-1 rounded-md bg-white dark:bg-[rgb(var(--color-card))] border dark:border-[rgb(var(--color-border))]">
              <div className="p-0.5 bg-green-600 rounded">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m-9.5 0H3m2 0h5.5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-[rgb(var(--color-text-secondary))]">
                  Shop Name
                </p>
                <p className="text-[10px] text-gray-900 dark:text-[rgb(var(--color-text))] font-medium">
                  {user?.user?.shopName || user?.shopName || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview Section */}
        <div className="mb-3">
          <h2 className="text-sm md:text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2 flex items-center">
            <svg className="w-4 h-4 md:w-3.5 md:h-3.5 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Financial Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-3">
            {/* Total Revenue */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-green-600 rounded flex-shrink-0">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Revenue</p>
                </div>
              </div>
            </div>

            {/* Total Collected */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-emerald-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalCollected || 0).toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Collected</p>
                </div>
              </div>
            </div>

            {/* Total Outstanding */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-yellow-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalCustomerOutstanding || 0).toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Outstanding</p>
                </div>
              </div>
            </div>

            {/* Supplier Outstanding */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-orange-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalSupplierOutstanding || 0).toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Supplier Due</p>
                </div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-red-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalExpenses || 0).toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Expenses</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Metrics Section */}
        <div className="mb-3">
          <h2 className="text-sm md:text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-2 flex items-center">
            <svg className="w-4 h-4 md:w-3.5 md:h-3.5 mr-1.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Profit & Loss
          </h2>
          <div className="grid grid-cols-3 gap-1.5 md:gap-3 overflow-hidden">
            {/* Operating Profit */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1.5 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-purple-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm md:text-lg font-bold leading-tight truncate ${(dashboardStats?.operatingProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₹{(dashboardStats?.operatingProfit || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Profit</p>
                </div>
              </div>
            </div>

            {/* Profit Margin */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1.5 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-indigo-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm md:text-lg font-bold leading-tight truncate ${(dashboardStats?.profitMargin || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(dashboardStats?.profitMargin || 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Margin</p>
                </div>
              </div>
            </div>

            {/* Total Invoices */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="flex items-center space-x-1.5 md:space-x-2 overflow-hidden">
                <div className="p-1 md:p-1.5 bg-blue-600 rounded flex-shrink-0">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.totalInvoices || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Invoices</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Button for Detailed Metrics */}
        <div className="mb-2 md:mb-3 flex justify-center">
          <button
            onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
            className="flex items-center gap-1.5 px-2 py-1.5 md:py-1 text-xs md:text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-[rgb(var(--color-primary))] dark:to-[rgb(var(--color-primary-hover))] text-white font-semibold rounded-md shadow-sm hover:shadow-md transform transition-all duration-200"
          >
            {showDetailedMetrics ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>Hide Detailed Metrics</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Show Detailed Metrics</span>
              </>
            )}
          </button>
        </div>

        {/* Detailed Metrics - Conditionally Rendered */}
        {showDetailedMetrics && (
          <>

            {/* Inventory Section */}
            <div className="mb-1.5 md:mb-3">
              <h2 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 md:mb-2 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Inventory Overview
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
                {/* Total Items */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                    <div className="p-1 md:p-1.5 bg-cyan-600 rounded flex-shrink-0">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.totalItems || 0}</p><p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Total Items</p></div></div>
                </div>

                {/* Low Stock Items */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                    <div className="p-1 md:p-1.5 bg-orange-600 rounded flex-shrink-0">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-lg font-bold leading-tight text-orange-600 dark:text-orange-400 truncate">{dashboardStats?.lowStockItems || 0}</p>
                      <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Low Stock</p>
                    </div>
                  </div>
                </div>

                {/* Out of Stock */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                    <div className="p-1 md:p-1.5 bg-red-600 rounded flex-shrink-0">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-lg font-bold leading-tight text-red-600 dark:text-red-400 truncate">{dashboardStats?.outOfStockItems || 0}</p>
                      <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Out of Stock</p>
                    </div>
                  </div>
                </div>

                {/* Inventory Value */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                    <div className="p-1 md:p-1.5 bg-teal-600 rounded flex-shrink-0">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalInventoryValue || 0).toLocaleString()}</p>
                      <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-[rgb(var(--color-text-secondary))] uppercase tracking-wide leading-tight truncate">Inventory Value</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash & Bank Section */}
            <div className="mb-1.5 md:mb-3">
              <h2 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 md:mb-2 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Cash & Bank
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
                {/* Cash in Hand */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                    <div className="p-1 md:p-1.5 bg-green-600 rounded flex-shrink-0">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.cashInHand || 0).toLocaleString()}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Cash in Hand</p></div></div>
                </div>

                {/* Bank Balance */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-blue-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m-9.5 0H3m2 0h5.5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalBankBalance || 0).toLocaleString()}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Bank Balance</p></div></div>
                </div>

                {/* Total Liquidity */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-emerald-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalLiquidity || 0).toLocaleString()}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Total Liquidity</p></div></div>
                </div>

                {/* Bank Accounts */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-indigo-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.bankAccountCount || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Bank Accounts</p></div></div>
                </div>
              </div>
            </div>

            {/* Sales, Purchase & Parties Section */}
            <div className="mb-1.5 md:mb-3">
              <h2 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 md:mb-2 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Sales, Purchase & Parties
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
                {/* Pending Sales Orders */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-amber-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.pendingSalesOrders || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Pending Orders</p></div></div>
                </div>

                {/* Total Purchases */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-violet-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.totalPurchases || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Total Purchases</p></div></div>
                </div>

                {/* Total Customers */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-pink-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.totalCustomers || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Total Customers</p></div></div>
                </div>

                {/* Total Suppliers */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-fuchsia-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m-9.5 0H3m2 0h5.5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.totalSuppliers || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Total Suppliers</p></div></div>
                </div>
              </div>
            </div>

            {/* Payments & Returns Section */}
            <div className="mb-1.5 md:mb-3">
              <h2 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 md:mb-2 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Payments & Returns
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
                {/* Payments In */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-green-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalPaymentsIn || 0).toLocaleString()}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Payments In</p></div></div>
                </div>

                {/* Payments Out */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-red-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">₹{(dashboardStats?.totalPaymentsOut || 0).toLocaleString()}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Payments Out</p></div></div>
                </div>

                {/* Sales Returns */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-orange-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.salesReturnsCount || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Sales Returns</p></div></div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">₹{(dashboardStats?.salesReturnsAmount || 0).toLocaleString()}</p>
                </div>

                {/* Purchase Returns */}
                <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded md:rounded-md shadow-sm dark:shadow-lg p-1 md:p-2 border dark:border-[rgb(var(--color-border))] transition-all duration-200 hover:shadow-md overflow-hidden">
                  <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden"><div className="p-1 md:p-1.5 bg-purple-600 rounded flex-shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div><div className="flex-1 min-w-0"><p className="text-xs md:text-lg font-bold leading-tight text-gray-900 dark:text-[rgb(var(--color-text))] truncate">{dashboardStats?.purchaseReturnsCount || 0}</p><p className="text-[9px] md:text-[10px] text-gray-600 dark:text-[rgb(var(--color-text-secondary))] font-semibold uppercase tracking-wide leading-tight truncate">Purchase Returns</p></div></div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">₹{(dashboardStats?.purchaseReturnsAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Analytical Graphs */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-3 mb-1.5 md:mb-3">
            {/* Sales Trend */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] p-1 md:p-2 rounded md:rounded-md shadow-sm border dark:border-[rgb(var(--color-border))] overflow-hidden">
              <h3 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-1 flex items-center">
                <svg
                  className="w-4 h-4 mr-1.5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Sales Trend (Last 30 Days)
              </h3>
              <div className="h-20 md:h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardStats.dailySales || []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                      className="hidden md:block"
                    />
                    <XAxis
                      dataKey="_id"
                      tick={{ fontSize: 7 }}
                      tickFormatter={(value) =>
                        value.split("-").slice(1).join("/")
                      }
                      stroke="#94a3b8"
                      height={15}
                    />
                    <YAxis tick={{ fontSize: 7 }} stroke="#94a3b8" width={25} hide={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgb(var(--color-card))",
                        border: "1px solid rgb(var(--color-border))",
                        borderRadius: "8px",
                        color: "rgb(var(--color-text))",
                      }}
                      itemStyle={{ color: "rgb(var(--color-primary))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalSales"
                      name="Sales"
                      stroke="#6366f1"
                      strokeWidth={1}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue vs Expenses */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] p-1 md:p-2 rounded md:rounded-md shadow-sm border dark:border-[rgb(var(--color-border))] overflow-hidden">
              <h3 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-1 flex items-center">
                <svg
                  className="w-4 h-4 mr-1.5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Revenue vs Expenses (Monthly)
              </h3>
              <div className="h-20 md:h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStats.revenueVsExpenses || []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                      className="hidden md:block"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 7 }}
                      stroke="#94a3b8"
                      height={15}
                    />
                    <YAxis tick={{ fontSize: 7 }} stroke="#94a3b8" width={25} />
                    <Tooltip
                      cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
                      contentStyle={{
                        backgroundColor: "rgb(var(--color-card))",
                        border: "1px solid rgb(var(--color-border))",
                        borderRadius: "8px",
                        color: "rgb(var(--color-text))",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: isMobile ? "0px" : "10px", fontSize: isMobile ? "7px" : "12px" }}
                      iconSize={isMobile ? 5 : 8}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      {...(isMobile && { barSize: 10 })}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      {...(isMobile && { barSize: 10 })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] p-1 md:p-2 rounded md:rounded-md shadow-sm border dark:border-[rgb(var(--color-border))] overflow-hidden">
              <h3 className="text-xs font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-1 flex items-center">
                <svg
                  className="w-4 h-4 mr-1.5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Payment Methods Distribution
              </h3>
              <div className="h-20 md:h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardStats.paymentMethods || []}
                      cx="50%"
                      cy={isMobile ? "35%" : "50%"}
                      innerRadius={isMobile ? 12 : 60}
                      outerRadius={isMobile ? 18 : 80}
                      paddingAngle={isMobile ? 1 : 5}
                      dataKey="count"
                      nameKey="_id"
                    >
                      {(dashboardStats.paymentMethods || []).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry._id === "cash"
                                ? "#10b981"
                                : entry._id === "upi"
                                  ? "#6366f1"
                                  : entry._id === "card"
                                    ? "#f59e0b"
                                    : "#94a3b8"
                            }
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgb(var(--color-card))",
                        border: "1px solid rgb(var(--color-border))",
                        borderRadius: "8px",
                        color: "rgb(var(--color-text))",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      layout={isMobile ? "horizontal" : "vertical"}
                      align={isMobile ? "center" : "right"}
                      verticalAlign={isMobile ? "bottom" : "middle"}
                      wrapperStyle={{ fontSize: isMobile ? "7px" : "12px", paddingTop: isMobile ? "0px" : "10px" }}
                      iconSize={isMobile ? 5 : 8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Customer Dues */}
            <div className="bg-white dark:bg-[rgb(var(--color-card))] p-1 md:p-2 rounded md:rounded-md shadow-sm border dark:border-[rgb(var(--color-border))] overflow-hidden">
              <h3 className="text-xs md:text-sm font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5 md:mb-1.5 flex items-center">
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Top Receivables
              </h3>
              <div className="space-y-1 md:space-y-2">
                {(dashboardStats.topCustomersWithDues || []).length > 0 ? (
                  (dashboardStats.topCustomersWithDues || []).map(
                    (customer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-1 md:p-2 rounded md:rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                      >
                        <div className="flex items-center space-x-1 md:space-x-2 overflow-hidden">
                          <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[8px] md:text-[10px] flex-shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate">
                            {customer.name}
                          </span>
                        </div>
                        <span className="font-bold text-xs md:text-sm text-red-500 flex-shrink-0">
                          ₹{customer.dues.toLocaleString()}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <div className="h-12 md:h-20 flex items-center justify-center text-gray-400 dark:text-gray-500 italic text-xs md:text-sm">
                    No outstanding dues found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Section - Now as helpful info */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[rgb(var(--color-card))] dark:to-[rgb(var(--color-card))] rounded-lg shadow-md dark:shadow-lg p-3 border dark:border-[rgb(var(--color-border))]">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-[rgb(var(--color-text))]">
                Quick Tips
              </h3>
              <p className="text-gray-600 dark:text-[rgb(var(--color-text-secondary))] text-[11px] md:text-xs">
                Graphs update in real-time as you add invoices and expenses. Use
                reports for detailed analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
