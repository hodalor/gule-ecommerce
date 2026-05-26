import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { registerUser, clearError } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

const defaultAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Zambia'
};

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: defaultAddress
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.address.street.trim()) {
      newErrors.addressStreet = 'Address is required';
    }

    if (!formData.address.city.trim()) {
      newErrors.addressCity = 'City is required';
    }

    if (!formData.address.state.trim()) {
      newErrors.addressState = 'State or province is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await dispatch(registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim() || undefined,
        password: formData.password,
        phone: formData.phone,
        address: formData.address
      })).unwrap();

      toast.success(formData.email
        ? 'Account created. Check your email if verification is enabled.'
        : 'Account created successfully.');
      navigate('/login', { replace: true });
    } catch (submitError) {
      toast.error(submitError || 'Registration failed');
    }
  };

  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Create your general account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Register once with your name, address, phone, and optional email to browse products and place orders.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.firstName ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.lastName ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.phone ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter your phone number"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address (Optional)</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.email ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter your email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Location / Address</h3>
              <div>
                <label htmlFor="address.street" className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  id="address.street"
                  name="address.street"
                  type="text"
                  value={formData.address.street}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.addressStreet ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter street address or location"
                />
                {errors.addressStreet && <p className="mt-1 text-sm text-red-600">{errors.addressStreet}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    id="address.city"
                    name="address.city"
                    type="text"
                    value={formData.address.city}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.addressCity ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="City"
                  />
                  {errors.addressCity && <p className="mt-1 text-sm text-red-600">{errors.addressCity}</p>}
                </div>

                <div>
                  <label htmlFor="address.state" className="block text-sm font-medium text-gray-700">State / Province</label>
                  <input
                    id="address.state"
                    name="address.state"
                    type="text"
                    value={formData.address.state}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.addressState ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="State or province"
                  />
                  {errors.addressState && <p className="mt-1 text-sm text-red-600">{errors.addressState}</p>}
                </div>

                <div>
                  <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input
                    id="address.zipCode"
                    name="address.zipCode"
                    type="text"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Postal code"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address.country" className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  id="address.country"
                  name="address.country"
                  type="text"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 pr-10 ${errors.password ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 mt-6 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                </button>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 pr-10 ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 mt-6 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                </button>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
          </form>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl shadow-sm p-8">
          <h3 className="text-2xl font-bold">Want to sell too?</h3>
          <p className="mt-4 text-sm text-slate-200">
            Start with one general account, browse products, place orders, and when you are ready click "Become a Seller" to add:
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-200">
            <li>Business name</li>
            <li>Business address</li>
            <li>Business phone and email</li>
            <li>Registered or unregistered status</li>
            <li>Registration number only when registered</li>
          </ul>
          <div className="mt-8 rounded-xl bg-white/10 p-4">
            <p className="text-sm font-medium">Seller onboarding flow</p>
            <p className="mt-2 text-sm text-slate-200">
              Create your general account now, then use the new `Become a Seller` button after login to open your store account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
