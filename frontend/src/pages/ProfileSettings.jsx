import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile, reset } from '../redux/slices/authSlice';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    shopName: '',
    gstNumber: '',
    shopAddress: '',
  });

  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const { name, email, phone, shopName, gstNumber, shopAddress } = formData;

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        shopName: user.shopName || '',
        gstNumber: user.gstNumber || '',
        shopAddress: user.shopAddress || '',
      });
    }
  }, [user]);

  // Handle success and error states
  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => {
        setShowSuccess(false);
        dispatch(reset());
      }, 3000);
    }
  }, [isSuccess, dispatch]);

  useEffect(() => {
    if (isError && message) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!name || name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email || email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (phone && phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: '',
      }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await dispatch(updateProfile(formData));
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-secondary">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 dark:text-[rgb(var(--color-text-secondary))] hover:text-gray-900 dark:hover:text-[rgb(var(--color-text))] mb-2 text-xs"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5">Profile Settings</h1>
          <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Update your personal and business information</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-green-600 dark:text-green-400 font-medium text-xs">Profile updated successfully!</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-[rgb(var(--color-card))] rounded-lg shadow-sm border dark:border-[rgb(var(--color-border))] p-3">
          <form onSubmit={onSubmit} className="space-y-2">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 pb-1 border-b dark:border-[rgb(var(--color-border))]">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Full Name Input */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={name}
                    onChange={onChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] ${errors.name
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-[rgb(var(--color-border))]'
                      }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] ${errors.email
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-[rgb(var(--color-border))]'
                      }`}
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
                </div>

                {/* Phone Input */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={onChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))] ${errors.phone
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-[rgb(var(--color-border))]'
                      }`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5 pb-1 border-b dark:border-[rgb(var(--color-border))]">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Shop Name Input */}
                <div>
                  <label
                    htmlFor="shopName"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    Shop Name
                  </label>
                  <input
                    type="text"
                    id="shopName"
                    name="shopName"
                    value={shopName}
                    onChange={onChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    placeholder="Enter your shop/business name"
                  />
                </div>

                {/* GST Number Input */}
                <div>
                  <label
                    htmlFor="gstNumber"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    GST Number (GSTIN)
                  </label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    value={gstNumber}
                    onChange={onChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    placeholder="e.g., 27AABCU9603R1ZM"
                  />
                </div>

                {/* Shop Address Input - Full Width */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="shopAddress"
                    className="block text-xs font-medium text-gray-700 dark:text-[rgb(var(--color-text-secondary))] mb-1"
                  >
                    Shop Address
                  </label>
                  <textarea
                    id="shopAddress"
                    name="shopAddress"
                    value={shopAddress}
                    onChange={onChange}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[rgb(var(--color-border))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition resize-none bg-white dark:bg-[rgb(var(--color-input))] text-gray-900 dark:text-[rgb(var(--color-text))]"
                    placeholder="Enter complete shop address (Street, City, State, PIN Code)"
                  />
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="pt-2 border-t dark:border-[rgb(var(--color-border))]">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-[rgb(var(--color-text))] mb-1.5">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-[rgb(var(--color-input))] p-2 rounded-lg border dark:border-[rgb(var(--color-border))]">
                  <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-0.5">User ID</p>
                  <p className="text-xs text-gray-900 dark:text-[rgb(var(--color-text))] break-all">{user._id}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[rgb(var(--color-input))] p-2 rounded-lg border dark:border-[rgb(var(--color-border))]">
                  <p className="text-xs font-medium text-gray-600 dark:text-[rgb(var(--color-text-secondary))] mb-0.5">Role</p>
                  <p className="text-xs text-gray-900 dark:text-[rgb(var(--color-text))] capitalize">{user.role || 'Owner'}</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2 border-t dark:border-[rgb(var(--color-border))]">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    shopName: user.shopName || '',
                    gstNumber: user.gstNumber || '',
                    shopAddress: user.shopAddress || '',
                  });
                  setErrors({});
                }}
                className="flex-1 px-4 py-1.5 text-xs border border-gray-300 dark:border-[rgb(var(--color-border))] text-gray-700 dark:text-[rgb(var(--color-text))] rounded-lg hover:bg-gray-50 dark:hover:bg-[rgb(var(--color-input))] font-medium transition bg-white dark:bg-[rgb(var(--color-card))]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-1.5 text-xs bg-indigo-600 dark:bg-[rgb(var(--color-primary))] text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-[rgb(var(--color-primary-hover))] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-1"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
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
            <div className="ml-2">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Keep your profile information up to date to ensure accurate records and effective communication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
