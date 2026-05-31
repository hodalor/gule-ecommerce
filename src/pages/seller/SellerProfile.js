import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { changePassword, getCurrentUser } from '../../store/slices/authSlice';

const emptyBusinessAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Zambia'
};

const readDraft = (userId, section) => {
  if (!userId) return {};
  try {
    const raw = window.localStorage.getItem(`seller-profile-draft:${userId}:${section}`);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

const writeDraft = (userId, section, value) => {
  if (!userId) return;
  window.localStorage.setItem(`seller-profile-draft:${userId}:${section}`, JSON.stringify(value));
};

const mapSellerToForms = (seller, fallbackUser) => ({
  personal: {
    firstName: seller?.firstName || fallbackUser?.firstName || '',
    lastName: seller?.lastName || fallbackUser?.lastName || '',
    email: seller?.email || fallbackUser?.email || '',
    phone: seller?.phone || fallbackUser?.phone || ''
  },
  business: {
    businessName: seller?.businessName || '',
    businessType: seller?.businessType || 'individual',
    businessDescription: seller?.businessDescription || '',
    businessRegistrationNumber: seller?.businessRegistrationNumber || '',
    taxNumber: seller?.taxNumber || '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    businessLicense: '',
    coverImage: '',
    businessAddress: {
      ...emptyBusinessAddress,
      ...(seller?.businessAddress || {})
    }
  },
  store: {
    profileImage: seller?.profileImage || '',
    businessLogo: seller?.businessLogo || '',
    notifications: seller?.preferences?.notifications ?? true,
    autoAcceptOrders: seller?.preferences?.autoAcceptOrders ?? false,
    language: seller?.preferences?.language || 'en',
    storeName: seller?.businessName || '',
    storeDescription: seller?.businessDescription || '',
    storeSlug: '',
    returnPolicy: '',
    shippingPolicy: '',
    privacyPolicy: '',
    termsOfService: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    }
  }
});

const SellerProfile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('personal');
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [businessForm, setBusinessForm] = useState(mapSellerToForms(null, null).business);
  const [storeForm, setStoreForm] = useState(mapSellerToForms(null, null).store);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const hydrateForms = useCallback((seller) => {
    const mapped = mapSellerToForms(seller, user);
    const businessDraft = readDraft(user?.id, 'business');
    const storeDraft = readDraft(user?.id, 'store');

    setPersonalForm(mapped.personal);
    setBusinessForm({
      ...mapped.business,
      ...businessDraft
    });
    setStoreForm({
      ...mapped.store,
      ...storeDraft,
      socialMedia: {
        ...mapped.store.socialMedia,
        ...(storeDraft.socialMedia || {})
      }
    });
  }, [user]);

  const fetchSellerProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setProfileLoading(true);
      const response = await api.get(`/sellers/${user.id}`);
      const seller = response.data?.seller || null;
      setSellerProfile(seller);
      hydrateForms(seller);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load seller profile');
    } finally {
      setProfileLoading(false);
    }
  }, [hydrateForms, user?.id]);

  useEffect(() => {
    fetchSellerProfile();
  }, [fetchSellerProfile]);

  const syncAfterSave = async (seller, message) => {
    setSellerProfile(seller);
    hydrateForms(seller);
    await dispatch(getCurrentUser());
    toast.success(message);
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaveLoading(true);
      const response = await api.put(`/sellers/${user.id}`, {
        firstName: personalForm.firstName.trim(),
        lastName: personalForm.lastName.trim(),
        phone: personalForm.phone.trim()
      });
      await syncAfterSave(response.data?.seller || null, 'Personal information updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update personal information');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaveLoading(true);
      const response = await api.put(`/sellers/${user.id}`, {
        businessName: businessForm.businessName.trim(),
        businessType: businessForm.businessType,
        businessDescription: businessForm.businessDescription.trim(),
        businessRegistrationNumber: businessForm.businessRegistrationNumber.trim(),
        taxNumber: businessForm.taxNumber.trim(),
        businessAddress: {
          street: businessForm.businessAddress.street.trim(),
          city: businessForm.businessAddress.city.trim(),
          state: businessForm.businessAddress.state.trim(),
          zipCode: businessForm.businessAddress.zipCode.trim(),
          country: businessForm.businessAddress.country.trim()
        }
      });
      writeDraft(user.id, 'business', {
        businessPhone: businessForm.businessPhone,
        businessEmail: businessForm.businessEmail,
        website: businessForm.website,
        businessLicense: businessForm.businessLicense,
        coverImage: businessForm.coverImage
      });
      await syncAfterSave(response.data?.seller || null, 'Business information updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update business information');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaveLoading(true);
      const response = await api.put(`/sellers/${user.id}`, {
        profileImage: storeForm.profileImage.trim(),
        businessLogo: storeForm.businessLogo.trim(),
        preferences: {
          notifications: storeForm.notifications,
          autoAcceptOrders: storeForm.autoAcceptOrders,
          language: storeForm.language
        }
      });
      writeDraft(user.id, 'store', {
        storeName: storeForm.storeName,
        storeDescription: storeForm.storeDescription,
        storeSlug: storeForm.storeSlug,
        returnPolicy: storeForm.returnPolicy,
        shippingPolicy: storeForm.shippingPolicy,
        privacyPolicy: storeForm.privacyPolicy,
        termsOfService: storeForm.termsOfService,
        socialMedia: storeForm.socialMedia
      });
      await syncAfterSave(response.data?.seller || null, 'Store settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update store settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      await dispatch(changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })).unwrap();

      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to change password');
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: UserIcon },
    { id: 'business', label: 'Business Info', icon: BuildingStorefrontIcon },
    { id: 'store', label: 'Store Settings', icon: GlobeAltIcon }
  ];

  const buttonBusy = saveLoading || loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-gray-600">Manage the live seller data used by your storefront and account.</p>
        </div>
        <button
          type="button"
          onClick={fetchSellerProfile}
          disabled={profileLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {profileLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {sellerProfile && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Verification Status</p>
            <p className="mt-1 font-semibold capitalize text-gray-900">
              {sellerProfile.verificationStatus || 'pending'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Business Name</p>
            <p className="mt-1 font-semibold text-gray-900">
              {sellerProfile.businessName || 'Not set'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Last Sync</p>
            <p className="mt-1 font-semibold text-gray-900">
              {sellerProfile.updatedAt ? new Date(sellerProfile.updatedAt).toLocaleString() : 'Not available'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm((value) => !value)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Change Password
                </button>
              </div>

              <form onSubmit={handlePersonalSubmit} className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
                  <p className="mt-1 text-sm text-gray-500">Your live seller avatar comes from the store image fields in the Store Settings tab.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                      type="text"
                      value={personalForm.firstName}
                      onChange={(e) => setPersonalForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                      type="text"
                      value={personalForm.lastName}
                      onChange={(e) => setPersonalForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={personalForm.email}
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={buttonBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {buttonBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </form>

              {showPasswordForm && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Change Password</h3>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Current Password *</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((value) => !value)}
                          className="absolute inset-y-0 right-0 pr-3"
                        >
                          {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">New Password *</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((value) => !value)}
                            className="absolute inset-y-0 right-0 pr-3"
                          >
                            {showNewPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password *</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((value) => !value)}
                            className="absolute inset-y-0 right-0 pr-3"
                          >
                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordForm(false)}
                        className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>

              <form onSubmit={handleBusinessSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Business Cover Preview</label>
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    {businessForm.coverImage ? (
                      <img
                        src={businessForm.coverImage}
                        alt="Business cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">No business cover image set</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business Name *</label>
                    <input
                      type="text"
                      value={businessForm.businessName}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessName: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business Type *</label>
                    <select
                      value={businessForm.businessType}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessType: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Business Description</label>
                  <textarea
                    value={businessForm.businessDescription}
                    onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessDescription: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Registration Number</label>
                    <input
                      type="text"
                      value={businessForm.businessRegistrationNumber}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessRegistrationNumber: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tax Number</label>
                    <input
                      type="text"
                      value={businessForm.taxNumber}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Additional business contact and media fields below are restored and saved on this device until dedicated backend endpoints are added.
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Business Address</h3>
                  <input
                    type="text"
                    value={businessForm.businessAddress.street}
                    onChange={(e) => setBusinessForm((prev) => ({
                      ...prev,
                      businessAddress: { ...prev.businessAddress, street: e.target.value }
                    }))}
                    placeholder="Street address"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <input
                      type="text"
                      value={businessForm.businessAddress.city}
                      onChange={(e) => setBusinessForm((prev) => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, city: e.target.value }
                      }))}
                      placeholder="City"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={businessForm.businessAddress.state}
                      onChange={(e) => setBusinessForm((prev) => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, state: e.target.value }
                      }))}
                      placeholder="State"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={businessForm.businessAddress.zipCode}
                      onChange={(e) => setBusinessForm((prev) => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, zipCode: e.target.value }
                      }))}
                      placeholder="ZIP Code"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={businessForm.businessAddress.country}
                      onChange={(e) => setBusinessForm((prev) => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, country: e.target.value }
                      }))}
                      placeholder="Country"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business Phone</label>
                    <input
                      type="tel"
                      value={businessForm.businessPhone}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessPhone: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business Email</label>
                    <input
                      type="email"
                      value={businessForm.businessEmail}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessEmail: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
                    <input
                      type="url"
                      value={businessForm.website}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, website: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business License</label>
                    <input
                      type="text"
                      value={businessForm.businessLicense}
                      onChange={(e) => setBusinessForm((prev) => ({ ...prev, businessLicense: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cover Image URL</label>
                  <input
                    type="url"
                    value={businessForm.coverImage}
                    onChange={(e) => setBusinessForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/store-cover.jpg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={buttonBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {buttonBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>

              <form onSubmit={handleStoreSubmit} className="space-y-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Store policies, social links, and storefront branding fields are restored and currently saved locally on this device alongside your live store preferences.
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Profile Image Preview</label>
                    <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                      {storeForm.profileImage ? (
                        <img
                          src={storeForm.profileImage}
                          alt="Profile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">No profile image set</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Business Logo Preview</label>
                    <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                      {storeForm.businessLogo ? (
                        <img
                          src={storeForm.businessLogo}
                          alt="Business logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">No business logo set</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Profile Image URL</label>
                    <input
                      type="url"
                      value={storeForm.profileImage}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, profileImage: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/profile-image.jpg"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Business Logo URL</label>
                    <input
                      type="url"
                      value={storeForm.businessLogo}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, businessLogo: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/logo.jpg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Store Name</label>
                    <input
                      type="text"
                      value={storeForm.storeName}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, storeName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Store URL Slug</label>
                    <input
                      type="text"
                      value={storeForm.storeSlug}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, storeSlug: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Store Description</label>
                  <textarea
                    value={storeForm.storeDescription}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, storeDescription: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-medium text-gray-900">Operational Preferences</h3>
                  <div className="mt-4 space-y-4">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Notifications Enabled</span>
                      <input
                        type="checkbox"
                        checked={storeForm.notifications}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, notifications: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Auto Accept Orders</span>
                      <input
                        type="checkbox"
                        checked={storeForm.autoAcceptOrders}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, autoAcceptOrders: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Language</label>
                      <select
                        value={storeForm.language}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, language: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="ny">Nyanja</option>
                        <option value="bem">Bemba</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Return Policy</label>
                    <textarea
                      value={storeForm.returnPolicy}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, returnPolicy: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Shipping Policy</label>
                    <textarea
                      value={storeForm.shippingPolicy}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, shippingPolicy: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Privacy Policy</label>
                    <textarea
                      value={storeForm.privacyPolicy}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, privacyPolicy: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Terms of Service</label>
                    <textarea
                      value={storeForm.termsOfService}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, termsOfService: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-medium text-gray-900">Social Media</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input
                      type="url"
                      value={storeForm.socialMedia.facebook}
                      onChange={(e) => setStoreForm((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                      }))}
                      placeholder="Facebook URL"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      value={storeForm.socialMedia.twitter}
                      onChange={(e) => setStoreForm((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                      }))}
                      placeholder="Twitter URL"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      value={storeForm.socialMedia.instagram}
                      onChange={(e) => setStoreForm((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                      }))}
                      placeholder="Instagram URL"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      value={storeForm.socialMedia.linkedin}
                      onChange={(e) => setStoreForm((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, linkedin: e.target.value }
                      }))}
                      placeholder="LinkedIn URL"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={buttonBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {buttonBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
