import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { upgradeToSeller } from '../store/slices/authSlice';

const defaultAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Zambia'
};

const BecomeSeller = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    businessName: '',
    businessPhone: user?.phone || '',
    businessEmail: user?.email || '',
    businessType: 'individual',
    businessDescription: '',
    isRegistered: false,
    businessRegistrationNumber: '',
    currentPassword: '',
    businessAddress: defaultAddress
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.businessName.trim()) {
      nextErrors.businessName = 'Business name is required';
    }

    if (!formData.businessPhone.trim()) {
      nextErrors.businessPhone = 'Business phone is required';
    }

    if (!formData.businessEmail.trim()) {
      nextErrors.businessEmail = 'Business email is required';
    }

    if (!formData.businessAddress.street.trim()) {
      nextErrors.street = 'Business address is required';
    }

    if (!formData.businessAddress.city.trim()) {
      nextErrors.city = 'City is required';
    }

    if (!formData.businessAddress.state.trim()) {
      nextErrors.state = 'State or province is required';
    }

    if (formData.isRegistered && !formData.businessRegistrationNumber.trim()) {
      nextErrors.businessRegistrationNumber = 'Registration number is required for registered businesses';
    }

    if (!formData.currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name.startsWith('businessAddress.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        businessAddress: {
          ...prev.businessAddress,
          [field]: value
        }
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      await dispatch(upgradeToSeller(formData)).unwrap();
      toast.success('Seller account created successfully');
      navigate('/seller/dashboard', { replace: true });
    } catch (error) {
      toast.error(error || 'Failed to create seller account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Become a Seller</h1>
          <p className="mt-2 text-gray-600">
            Upgrade your general account into a seller account and start listing products.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            Your general account details stay intact. This step adds your business profile so you can sell on the marketplace.
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">Business Name</label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.businessName ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter business name"
                />
                {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
              </div>

              <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">Business Type</label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700">Business Phone</label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  type="tel"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.businessPhone ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter business phone"
                />
                {errors.businessPhone && <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>}
              </div>

              <div>
                <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700">Business Email</label>
                <input
                  id="businessEmail"
                  name="businessEmail"
                  type="email"
                  value={formData.businessEmail}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.businessEmail ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter business email"
                />
                {errors.businessEmail && <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700">Business Description</label>
              <textarea
                id="businessDescription"
                name="businessDescription"
                rows={4}
                value={formData.businessDescription}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe your business, products, and service style"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Business Address</h2>
              <div>
                <label htmlFor="businessAddress.street" className="block text-sm font-medium text-gray-700">Street Address</label>
                <input
                  id="businessAddress.street"
                  name="businessAddress.street"
                  type="text"
                  value={formData.businessAddress.street}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.street ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Business address"
                />
                {errors.street && <p className="mt-1 text-sm text-red-600">{errors.street}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="businessAddress.city" className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    id="businessAddress.city"
                    name="businessAddress.city"
                    type="text"
                    value={formData.businessAddress.city}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.city ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="City"
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                </div>

                <div>
                  <label htmlFor="businessAddress.state" className="block text-sm font-medium text-gray-700">State / Province</label>
                  <input
                    id="businessAddress.state"
                    name="businessAddress.state"
                    type="text"
                    value={formData.businessAddress.state}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.state ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="State or province"
                  />
                  {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                </div>

                <div>
                  <label htmlFor="businessAddress.zipCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input
                    id="businessAddress.zipCode"
                    name="businessAddress.zipCode"
                    type="text"
                    value={formData.businessAddress.zipCode}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Postal code"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessAddress.country" className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  id="businessAddress.country"
                  name="businessAddress.country"
                  type="text"
                  value={formData.businessAddress.country}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isRegistered"
                  checked={formData.isRegistered}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-800">This business is registered</span>
              </label>

              {formData.isRegistered && (
                <div className="mt-4">
                  <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700">Registration Number</label>
                  <input
                    id="businessRegistrationNumber"
                    name="businessRegistrationNumber"
                    type="text"
                    value={formData.businessRegistrationNumber}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.businessRegistrationNumber ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Enter registration number"
                  />
                  {errors.businessRegistrationNumber && <p className="mt-1 text-sm text-red-600">{errors.businessRegistrationNumber}</p>}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.currentPassword ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                placeholder="Confirm your current password"
              />
              {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creating seller account...' : 'Become a Seller'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BecomeSeller;
