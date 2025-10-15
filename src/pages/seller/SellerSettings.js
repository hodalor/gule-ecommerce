import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  TruckIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const SellerSettings = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      newMessages: true,
      lowStock: true,
      paymentReceived: true,
      reviewReceived: true,
      promotionalEmails: false,
      weeklyReports: true,
      monthlyReports: true,
      systemUpdates: false,
      securityAlerts: true
    },
    privacy: {
      showEmail: false,
      showPhone: false,
      showAddress: false,
      allowMessages: true,
      showOnlineStatus: true,
      profileVisibility: 'public'
    },
    shipping: {
      freeShippingThreshold: 50,
      standardShippingRate: 5.99,
      expeditedShippingRate: 12.99,
      internationalShipping: false,
      handlingTime: 1,
      returnWindow: 30,
      autoAcceptReturns: false
    },
    payment: {
      paymentMethod: 'bank_transfer',
      payoutSchedule: 'weekly',
      minimumPayout: 25,
      taxCalculation: 'automatic',
      invoicePrefix: 'INV',
      currency: 'USD'
    },
    store: {
      maintenanceMode: false,
      vacationMode: false,
      vacationMessage: '',
      autoReply: true,
      autoReplyMessage: 'Thank you for your message. We will get back to you within 24 hours.',
      showInventoryCount: true,
      allowBackorders: false,
      requireAccountForPurchase: false
    },
    analytics: {
      shareDataWithGoogle: false,
      trackCustomerBehavior: true,
      enableHeatmaps: false,
      allowThirdPartyAnalytics: false,
      dataRetentionPeriod: '2_years'
    }
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    // Load settings from user data or API
    if (user?.settings) {
      setSettings(prev => ({ ...prev, ...user.settings }));
    }
  }, [user]);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    setUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      // In a real app, this would call an API to save settings
      // await dispatch(updateSettings(settings)).unwrap();
      
      toast.success('Settings saved successfully');
      setUnsavedChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    // Reset to default settings
    setSettings({
      notifications: {
        orderUpdates: true,
        newMessages: true,
        lowStock: true,
        paymentReceived: true,
        reviewReceived: true,
        promotionalEmails: false,
        weeklyReports: true,
        monthlyReports: true,
        systemUpdates: false,
        securityAlerts: true
      },
      privacy: {
        showEmail: false,
        showPhone: false,
        showAddress: false,
        allowMessages: true,
        showOnlineStatus: true,
        profileVisibility: 'public'
      },
      shipping: {
        freeShippingThreshold: 50,
        standardShippingRate: 5.99,
        expeditedShippingRate: 12.99,
        internationalShipping: false,
        handlingTime: 1,
        returnWindow: 30,
        autoAcceptReturns: false
      },
      payment: {
        paymentMethod: 'bank_transfer',
        payoutSchedule: 'weekly',
        minimumPayout: 25,
        taxCalculation: 'automatic',
        invoicePrefix: 'INV',
        currency: 'USD'
      },
      store: {
        maintenanceMode: false,
        vacationMode: false,
        vacationMessage: '',
        autoReply: true,
        autoReplyMessage: 'Thank you for your message. We will get back to you within 24 hours.',
        showInventoryCount: true,
        allowBackorders: false,
        requireAccountForPurchase: false
      },
      analytics: {
        shareDataWithGoogle: false,
        trackCustomerBehavior: true,
        enableHeatmaps: false,
        allowThirdPartyAnalytics: false,
        dataRetentionPeriod: '2_years'
      }
    });
    setUnsavedChanges(true);
    toast.success('Settings reset to defaults');
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'shipping', label: 'Shipping', icon: TruckIcon },
    { id: 'payment', label: 'Payment', icon: CreditCardIcon },
    { id: 'store', label: 'Store Settings', icon: GlobeAltIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
  ];

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and store settings</p>
        </div>
        {unsavedChanges && (
          <div className="flex gap-3">
            <button
              onClick={handleResetSettings}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <CheckIcon className="h-5 w-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Unsaved Changes Warning */}
      {unsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800 text-sm">
            You have unsaved changes. Don't forget to save your settings.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
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
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
              
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Order Notifications</h3>
                <ToggleSwitch
                  enabled={settings.notifications.orderUpdates}
                  onChange={(value) => handleSettingChange('notifications', 'orderUpdates', value)}
                  label="Order Updates"
                  description="Get notified when orders are placed, updated, or completed"
                />
                <ToggleSwitch
                  enabled={settings.notifications.paymentReceived}
                  onChange={(value) => handleSettingChange('notifications', 'paymentReceived', value)}
                  label="Payment Received"
                  description="Notification when payments are processed"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Communication</h3>
                <ToggleSwitch
                  enabled={settings.notifications.newMessages}
                  onChange={(value) => handleSettingChange('notifications', 'newMessages', value)}
                  label="New Messages"
                  description="Get notified when customers send you messages"
                />
                <ToggleSwitch
                  enabled={settings.notifications.reviewReceived}
                  onChange={(value) => handleSettingChange('notifications', 'reviewReceived', value)}
                  label="New Reviews"
                  description="Notification when customers leave reviews"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Inventory</h3>
                <ToggleSwitch
                  enabled={settings.notifications.lowStock}
                  onChange={(value) => handleSettingChange('notifications', 'lowStock', value)}
                  label="Low Stock Alerts"
                  description="Get notified when product inventory is running low"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Reports & Updates</h3>
                <ToggleSwitch
                  enabled={settings.notifications.weeklyReports}
                  onChange={(value) => handleSettingChange('notifications', 'weeklyReports', value)}
                  label="Weekly Reports"
                  description="Receive weekly sales and performance reports"
                />
                <ToggleSwitch
                  enabled={settings.notifications.monthlyReports}
                  onChange={(value) => handleSettingChange('notifications', 'monthlyReports', value)}
                  label="Monthly Reports"
                  description="Receive monthly business insights and analytics"
                />
                <ToggleSwitch
                  enabled={settings.notifications.systemUpdates}
                  onChange={(value) => handleSettingChange('notifications', 'systemUpdates', value)}
                  label="System Updates"
                  description="Get notified about platform updates and new features"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Marketing & Security</h3>
                <ToggleSwitch
                  enabled={settings.notifications.promotionalEmails}
                  onChange={(value) => handleSettingChange('notifications', 'promotionalEmails', value)}
                  label="Promotional Emails"
                  description="Receive marketing tips and promotional opportunities"
                />
                <ToggleSwitch
                  enabled={settings.notifications.securityAlerts}
                  onChange={(value) => handleSettingChange('notifications', 'securityAlerts', value)}
                  label="Security Alerts"
                  description="Important security notifications and login alerts"
                />
              </div>
            </div>
          )}

          {/* Privacy & Security Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Privacy & Security Settings</h2>
              
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Profile Visibility</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Visibility
                    </label>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="public">Public - Anyone can view</option>
                      <option value="customers">Customers Only - Only buyers can view</option>
                      <option value="private">Private - Hidden from search</option>
                    </select>
                  </div>
                </div>
                
                <ToggleSwitch
                  enabled={settings.privacy.showEmail}
                  onChange={(value) => handleSettingChange('privacy', 'showEmail', value)}
                  label="Show Email Address"
                  description="Display your email address on your public profile"
                />
                <ToggleSwitch
                  enabled={settings.privacy.showPhone}
                  onChange={(value) => handleSettingChange('privacy', 'showPhone', value)}
                  label="Show Phone Number"
                  description="Display your phone number on your public profile"
                />
                <ToggleSwitch
                  enabled={settings.privacy.showAddress}
                  onChange={(value) => handleSettingChange('privacy', 'showAddress', value)}
                  label="Show Business Address"
                  description="Display your business address on your public profile"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Communication Settings</h3>
                <ToggleSwitch
                  enabled={settings.privacy.allowMessages}
                  onChange={(value) => handleSettingChange('privacy', 'allowMessages', value)}
                  label="Allow Customer Messages"
                  description="Allow customers to send you direct messages"
                />
                <ToggleSwitch
                  enabled={settings.privacy.showOnlineStatus}
                  onChange={(value) => handleSettingChange('privacy', 'showOnlineStatus', value)}
                  label="Show Online Status"
                  description="Display when you're online to customers"
                />
              </div>
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free Shipping Threshold ($)
                  </label>
                  <input
                    type="number"
                    value={settings.shipping.freeShippingThreshold}
                    onChange={(e) => handleSettingChange('shipping', 'freeShippingThreshold', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Shipping Rate ($)
                  </label>
                  <input
                    type="number"
                    value={settings.shipping.standardShippingRate}
                    onChange={(e) => handleSettingChange('shipping', 'standardShippingRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expedited Shipping Rate ($)
                  </label>
                  <input
                    type="number"
                    value={settings.shipping.expeditedShippingRate}
                    onChange={(e) => handleSettingChange('shipping', 'expeditedShippingRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handling Time (days)
                  </label>
                  <select
                    value={settings.shipping.handlingTime}
                    onChange={(e) => handleSettingChange('shipping', 'handlingTime', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 day</option>
                    <option value={2}>2 days</option>
                    <option value={3}>3 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>7 days</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Shipping Options</h3>
                <ToggleSwitch
                  enabled={settings.shipping.internationalShipping}
                  onChange={(value) => handleSettingChange('shipping', 'internationalShipping', value)}
                  label="International Shipping"
                  description="Offer shipping to international customers"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Return Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Window (days)
                  </label>
                  <select
                    value={settings.shipping.returnWindow}
                    onChange={(e) => handleSettingChange('shipping', 'returnWindow', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
                <ToggleSwitch
                  enabled={settings.shipping.autoAcceptReturns}
                  onChange={(value) => handleSettingChange('shipping', 'autoAcceptReturns', value)}
                  label="Auto-Accept Returns"
                  description="Automatically approve return requests within the return window"
                />
              </div>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Payment Method
                  </label>
                  <select
                    value={settings.payment.paymentMethod}
                    onChange={(e) => handleSettingChange('payment', 'paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payout Schedule
                  </label>
                  <select
                    value={settings.payment.payoutSchedule}
                    onChange={(e) => handleSettingChange('payment', 'payoutSchedule', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Payout Amount ($)
                  </label>
                  <input
                    type="number"
                    value={settings.payment.minimumPayout}
                    onChange={(e) => handleSettingChange('payment', 'minimumPayout', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={settings.payment.currency}
                    onChange={(e) => handleSettingChange('payment', 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Invoice Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.payment.invoicePrefix}
                      onChange={(e) => handleSettingChange('payment', 'invoicePrefix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="INV"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Calculation
                    </label>
                    <select
                      value={settings.payment.taxCalculation}
                      onChange={(e) => handleSettingChange('payment', 'taxCalculation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                      <option value="none">No Tax</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Store Settings Tab */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>
              
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Store Status</h3>
                <ToggleSwitch
                  enabled={settings.store.maintenanceMode}
                  onChange={(value) => handleSettingChange('store', 'maintenanceMode', value)}
                  label="Maintenance Mode"
                  description="Temporarily disable your store for maintenance"
                />
                <ToggleSwitch
                  enabled={settings.store.vacationMode}
                  onChange={(value) => handleSettingChange('store', 'vacationMode', value)}
                  label="Vacation Mode"
                  description="Put your store on vacation mode"
                />
                
                {settings.store.vacationMode && (
                  <div className="ml-6 mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vacation Message
                    </label>
                    <textarea
                      value={settings.store.vacationMessage}
                      onChange={(e) => handleSettingChange('store', 'vacationMessage', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="We're currently on vacation and will be back soon..."
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Customer Communication</h3>
                <ToggleSwitch
                  enabled={settings.store.autoReply}
                  onChange={(value) => handleSettingChange('store', 'autoReply', value)}
                  label="Auto-Reply Messages"
                  description="Automatically reply to customer messages"
                />
                
                {settings.store.autoReply && (
                  <div className="ml-6 mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-Reply Message
                    </label>
                    <textarea
                      value={settings.store.autoReplyMessage}
                      onChange={(e) => handleSettingChange('store', 'autoReplyMessage', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Product Display</h3>
                <ToggleSwitch
                  enabled={settings.store.showInventoryCount}
                  onChange={(value) => handleSettingChange('store', 'showInventoryCount', value)}
                  label="Show Inventory Count"
                  description="Display remaining stock count to customers"
                />
                <ToggleSwitch
                  enabled={settings.store.allowBackorders}
                  onChange={(value) => handleSettingChange('store', 'allowBackorders', value)}
                  label="Allow Backorders"
                  description="Allow customers to order out-of-stock items"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Purchase Requirements</h3>
                <ToggleSwitch
                  enabled={settings.store.requireAccountForPurchase}
                  onChange={(value) => handleSettingChange('store', 'requireAccountForPurchase', value)}
                  label="Require Account for Purchase"
                  description="Customers must create an account to make purchases"
                />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Analytics & Data Settings</h2>
              
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Data Collection</h3>
                <ToggleSwitch
                  enabled={settings.analytics.trackCustomerBehavior}
                  onChange={(value) => handleSettingChange('analytics', 'trackCustomerBehavior', value)}
                  label="Track Customer Behavior"
                  description="Collect data on how customers interact with your store"
                />
                <ToggleSwitch
                  enabled={settings.analytics.enableHeatmaps}
                  onChange={(value) => handleSettingChange('analytics', 'enableHeatmaps', value)}
                  label="Enable Heatmaps"
                  description="Generate heatmaps showing customer interaction patterns"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">Third-Party Integration</h3>
                <ToggleSwitch
                  enabled={settings.analytics.shareDataWithGoogle}
                  onChange={(value) => handleSettingChange('analytics', 'shareDataWithGoogle', value)}
                  label="Google Analytics Integration"
                  description="Share data with Google Analytics for enhanced insights"
                />
                <ToggleSwitch
                  enabled={settings.analytics.allowThirdPartyAnalytics}
                  onChange={(value) => handleSettingChange('analytics', 'allowThirdPartyAnalytics', value)}
                  label="Third-Party Analytics"
                  description="Allow integration with other analytics platforms"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Data Retention</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Retention Period
                  </label>
                  <select
                    value={settings.analytics.dataRetentionPeriod}
                    onChange={(e) => handleSettingChange('analytics', 'dataRetentionPeriod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="6_months">6 months</option>
                    <option value="1_year">1 year</option>
                    <option value="2_years">2 years</option>
                    <option value="5_years">5 years</option>
                    <option value="indefinite">Indefinite</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    How long to keep customer and analytics data
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerSettings;