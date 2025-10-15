import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPrivacySettings,
  updatePrivacySetting,
  togglePreviewMode,
  setPreviewMode,
} from '../../store/slices/settingsSlice';
import {
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const PrivacySettings = () => {
  const dispatch = useDispatch();
  const { 
    privacySettings, 
    loading, 
    error, 
    previewMode 
  } = useSelector((state) => state.settings);
  const { user } = useSelector((state) => state.auth);

  const [localSettings, setLocalSettings] = useState({
    shareBuyerName: false,
    shareBuyerContact: false,
    shareBuyerAddress: false
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    dispatch(fetchPrivacySettings());
  }, [dispatch]);

  useEffect(() => {
    if (privacySettings) {
      setLocalSettings(privacySettings);
    }
  }, [privacySettings]);

  useEffect(() => {
    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(privacySettings);
    setHasChanges(hasChanges);
  }, [localSettings, privacySettings]);

  const handleToggle = (setting) => {
    setLocalSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSave = async () => {
    // Update each setting individually
    for (const [setting, value] of Object.entries(localSettings)) {
      if (privacySettings[setting] !== value) {
        await dispatch(updatePrivacySetting({ setting, value }));
      }
    }
  };

  const handleReset = () => {
    setLocalSettings(privacySettings);
  };

  const togglePreview = () => {
    dispatch(togglePreviewMode());
  };

  // Mock buyer data for preview
  const mockBuyerData = {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States'
    }
  };

  const canManageSettings = user?.role === 'Super Admin' || user?.role === 'Admin';

  if (!canManageSettings) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <EyeSlashIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access privacy settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
          <p className="text-gray-600">Control what buyer information is shared with sellers</p>
        </div>
        <button
          onClick={togglePreview}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            previewMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {previewMode ? (
            <>
              <EyeSlashIcon className="h-4 w-4 mr-2" />
              Exit Preview
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4 mr-2" />
              Preview Mode
            </>
          )}
        </button>
      </div>

      {/* Preview Mode Banner */}
      {previewMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Preview Mode Active
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>You're viewing how the seller interface will look with current settings.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Privacy Controls</h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure what buyer information sellers can see
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Share Buyer Name */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Share Buyer Name</h4>
                <p className="text-sm text-gray-500">
                  Allow sellers to see the buyer's full name
                </p>
              </div>
              <button
                onClick={() => handleToggle('shareBuyerName')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  localSettings.shareBuyerName ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localSettings.shareBuyerName ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Share Buyer Contact */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Share Buyer Contact</h4>
                <p className="text-sm text-gray-500">
                  Allow sellers to see the buyer's email and phone number
                </p>
              </div>
              <button
                onClick={() => handleToggle('shareBuyerContact')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  localSettings.shareBuyerContact ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localSettings.shareBuyerContact ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Share Buyer Address */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Share Buyer Address</h4>
                <p className="text-sm text-gray-500">
                  Allow sellers to see the buyer's shipping address
                </p>
              </div>
              <button
                onClick={() => handleToggle('shareBuyerAddress')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  localSettings.shareBuyerAddress ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localSettings.shareBuyerAddress ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save/Reset Buttons */}
            {hasChanges && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Reset
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Seller View Preview
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              How sellers will see buyer information
            </p>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Order #12345</h4>
              
              <div className="space-y-3">
                {/* Buyer Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Buyer Name
                  </label>
                  <div className="mt-1">
                    {localSettings.shareBuyerName ? (
                      <span className="text-sm text-gray-900">{mockBuyerData.name}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Hidden for privacy</span>
                    )}
                  </div>
                </div>

                {/* Buyer Contact */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Contact Information
                  </label>
                  <div className="mt-1 space-y-1">
                    {localSettings.shareBuyerContact ? (
                      <>
                        <div className="text-sm text-gray-900">{mockBuyerData.email}</div>
                        <div className="text-sm text-gray-900">{mockBuyerData.phone}</div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Hidden for privacy</span>
                    )}
                  </div>
                </div>

                {/* Buyer Address */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Shipping Address
                  </label>
                  <div className="mt-1">
                    {localSettings.shareBuyerAddress ? (
                      <div className="text-sm text-gray-900">
                        <div>{mockBuyerData.address.street}</div>
                        <div>
                          {mockBuyerData.address.city}, {mockBuyerData.address.state} {mockBuyerData.address.zipCode}
                        </div>
                        <div>{mockBuyerData.address.country}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Hidden for privacy</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Impact Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Privacy Impact</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    localSettings.shareBuyerName ? 'bg-red-400' : 'bg-green-400'
                  }`}></span>
                  Buyer name is {localSettings.shareBuyerName ? 'visible' : 'protected'}
                </li>
                <li className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    localSettings.shareBuyerContact ? 'bg-red-400' : 'bg-green-400'
                  }`}></span>
                  Contact info is {localSettings.shareBuyerContact ? 'visible' : 'protected'}
                </li>
                <li className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    localSettings.shareBuyerAddress ? 'bg-red-400' : 'bg-green-400'
                  }`}></span>
                  Address is {localSettings.shareBuyerAddress ? 'visible' : 'protected'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">How Privacy Settings Work</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Buyer Name Sharing</h4>
              <p className="text-sm text-gray-600">
                When enabled, sellers can see the buyer's full name. When disabled, 
                buyers appear as "Anonymous Buyer" to protect their identity.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
              <p className="text-sm text-gray-600">
                Controls whether sellers can see buyer email and phone numbers. 
                Useful for direct communication but may compromise buyer privacy.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Address Sharing</h4>
              <p className="text-sm text-gray-600">
                Determines if sellers can view shipping addresses. Essential for 
                physical goods but can be hidden for digital products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;