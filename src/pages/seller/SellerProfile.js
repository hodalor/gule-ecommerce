import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { updateProfile, changePassword } from '../../store/slices/authSlice';

const SellerProfile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Personal Information Form
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: ''
  });

  // Business Information Form
  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    businessDescription: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessZip: '',
    businessCountry: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    taxId: '',
    businessLicense: '',
    coverImage: ''
  });

  // Store Settings Form
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    storeDescription: '',
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
  });

  // Password Change Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize forms with user data
  useEffect(() => {
    if (user) {
      setPersonalForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });

      setBusinessForm({
        businessName: user.businessName || '',
        businessDescription: user.businessDescription || '',
        businessAddress: user.businessAddress || '',
        businessCity: user.businessCity || '',
        businessState: user.businessState || '',
        businessZip: user.businessZip || '',
        businessCountry: user.businessCountry || '',
        businessPhone: user.businessPhone || '',
        businessEmail: user.businessEmail || '',
        website: user.website || '',
        taxId: user.taxId || '',
        businessLicense: user.businessLicense || '',
        coverImage: user.coverImage || ''
      });

      setStoreForm({
        storeName: user.storeName || '',
        storeDescription: user.storeDescription || '',
        storeSlug: user.storeSlug || '',
        returnPolicy: user.returnPolicy || '',
        shippingPolicy: user.shippingPolicy || '',
        privacyPolicy: user.privacyPolicy || '',
        termsOfService: user.termsOfService || '',
        socialMedia: {
          facebook: user.socialMedia?.facebook || '',
          twitter: user.socialMedia?.twitter || '',
          instagram: user.socialMedia?.instagram || '',
          linkedin: user.socialMedia?.linkedin || ''
        }
      });
    }
  }, [user]);

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile(personalForm)).unwrap();
      toast.success('Personal information updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update personal information');
    }
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile(businessForm)).unwrap();
      toast.success('Business information updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update business information');
    }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile(storeForm)).unwrap();
      toast.success('Store settings updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update store settings');
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
      toast.error(error.message || 'Failed to change password');
    }
  };

  const handleImageUpload = (field, formType) => {
    // In a real app, this would handle file upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Mock image URL - in real app, upload to server/cloud storage
        const mockImageUrl = `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face`;
        
        if (formType === 'personal') {
          setPersonalForm(prev => ({ ...prev, [field]: mockImageUrl }));
        } else if (formType === 'business') {
          setBusinessForm(prev => ({ ...prev, [field]: mockImageUrl }));
        }
        
        toast.success('Image uploaded successfully');
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: UserIcon },
    { id: 'business', label: 'Business Info', icon: BuildingStorefrontIcon },
    { id: 'store', label: 'Store Settings', icon: GlobeAltIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and store information</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Change Password
                </button>
              </div>

              <form onSubmit={handlePersonalSubmit} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                      {personalForm.avatar ? (
                        <img
                          src={personalForm.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImageUpload('avatar', 'personal')}
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
                    <p className="text-sm text-gray-600">Upload a professional photo for your profile</p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={personalForm.firstName}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={personalForm.lastName}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={personalForm.email}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckIcon className="h-5 w-5" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {/* Password Change Form */}
              {showPasswordForm && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          required
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showCurrentPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            required
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showNewPassword ? (
                              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <EyeIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showConfirmPassword ? (
                              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <EyeIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordForm(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Business Information Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>

              <form onSubmit={handleBusinessSubmit} className="space-y-6">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Cover Image
                  </label>
                  <div className="relative">
                    <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                      {businessForm.coverImage ? (
                        <img
                          src={businessForm.coverImage}
                          alt="Business Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BuildingStorefrontIcon className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImageUpload('coverImage', 'business')}
                      className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <CameraIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Business Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessForm.businessName}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, businessName: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={businessForm.website}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Business Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Description *
                  </label>
                  <textarea
                    value={businessForm.businessDescription}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, businessDescription: e.target.value }))}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your business..."
                  />
                </div>

                {/* Business Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Business Address</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={businessForm.businessAddress}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, businessAddress: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={businessForm.businessCity}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, businessCity: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        value={businessForm.businessState}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, businessState: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={businessForm.businessZip}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, businessZip: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        value={businessForm.businessCountry}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, businessCountry: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Phone
                    </label>
                    <input
                      type="tel"
                      value={businessForm.businessPhone}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, businessPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={businessForm.businessEmail}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, businessEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Legal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID / EIN
                    </label>
                    <input
                      type="text"
                      value={businessForm.taxId}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, taxId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business License Number
                    </label>
                    <input
                      type="text"
                      value={businessForm.businessLicense}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, businessLicense: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckIcon className="h-5 w-5" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Store Settings Tab */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>

              <form onSubmit={handleStoreSubmit} className="space-y-6">
                {/* Store Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      value={storeForm.storeName}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, storeName: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store URL Slug *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        /store/
                      </span>
                      <input
                        type="text"
                        value={storeForm.storeSlug}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, storeSlug: e.target.value }))}
                        required
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your-store-name"
                      />
                    </div>
                  </div>
                </div>

                {/* Store Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Description *
                  </label>
                  <textarea
                    value={storeForm.storeDescription}
                    onChange={(e) => setStoreForm(prev => ({ ...prev, storeDescription: e.target.value }))}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your store and what you sell..."
                  />
                </div>

                {/* Policies */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Store Policies</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Policy
                    </label>
                    <textarea
                      value={storeForm.returnPolicy}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, returnPolicy: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe your return policy..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Policy
                    </label>
                    <textarea
                      value={storeForm.shippingPolicy}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, shippingPolicy: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe your shipping policy..."
                    />
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Social Media Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Facebook
                      </label>
                      <input
                        type="url"
                        value={storeForm.socialMedia.facebook}
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://facebook.com/yourstore"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Twitter
                      </label>
                      <input
                        type="url"
                        value={storeForm.socialMedia.twitter}
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://twitter.com/yourstore"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={storeForm.socialMedia.instagram}
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://instagram.com/yourstore"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={storeForm.socialMedia.linkedin}
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, linkedin: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://linkedin.com/company/yourstore"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckIcon className="h-5 w-5" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;