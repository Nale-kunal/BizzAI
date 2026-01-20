import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { performPasswordReset, reset } from '../redux/slices/authSlice';
import SecurePasswordInput from '../components/SecurePasswordInput';

const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSymbol;
};

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess, message, user } = useSelector((s) => s.auth);

  const params = new URLSearchParams(location.search);
  const [email] = useState(params.get('email') || '');
  const [token] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard');
    return () => dispatch(reset());
  }, [user, navigate, dispatch]);

  const onSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!token || !email) {
      setValidationError('Reset link is invalid. Please request a new one.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (!isStrongPassword(password)) {
      setValidationError('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
      return;
    }

    dispatch(performPasswordReset({ token, email, password }));
  };

  useEffect(() => {
    // On successful reset, redirect to login after short delay
    if (isSuccess) {
      const t = setTimeout(() => navigate('/login'), 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-600 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold  text-main">Reset Password</h1>
          <p className=" text-secondary mt-2">Set a new password for {email || 'your account'}</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          {(validationError || isError || isSuccess) && (
            <div className={`mb-6 p-4 border rounded-lg ${validationError ? 'bg-yellow-50 border-yellow-200' : isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`${validationError ? 'text-yellow-700' : isSuccess ? 'text-green-700' : 'text-red-600'} text-sm`}>
                {validationError || message}
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium  text-secondary mb-2">New Password</label>
              <SecurePasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
                placeholder="Min 8+ characters"
                className="w-full px-4 py-3 border border-default rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium  text-secondary mb-2">Confirm Password</label>
              <SecurePasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                showPassword={showConfirmPassword}
                onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 border border-default rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className=" text-secondary text-sm">
              Back to{' '}<Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700 transition">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
