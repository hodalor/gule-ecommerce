import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  BellIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  CheckIcon,
  ShieldCheckIcon,
  TruckIcon,
  CreditCardIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const createDefaultSettings = () => ({
  notifications: {
    notifications: true,
    autoAcceptOrders: false,
    language: 'en',
    newMessages: true,
    lowStock: true,
    weeklyReports: true,
    monthlyReports: true,
    systemUpdates: false,
    securityAlerts: true,
    promotionalEmails: false
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
    currency: 'ZMW'
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

const readSettingsDraft = (userId) => {
  if (!userId) return createDefaultSettings();
  try {
    const raw = window.localStorage.getItem(`seller-settings-draft:${userId}`);
    return raw ? { ...createDefaultSettings(), ...JSON.parse(raw) } : createDefaultSettings();
  } catch (error) {
    return createDefaultSettings();
  }
};

const writeSettingsDraft = (userId, settings) => {
  if (!userId) return;
  window.localStorage.setItem(`seller-settings-draft:${userId}`, JSON.stringify(settings));
};

const ToggleRow = ({ label, description, checked, onChange }) => (
  <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
    <div className="pr-4">
      <p className="font-medium text-gray-900">{label}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  </label>
);

const SellerSettings = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState(createDefaultSettings());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [meta, setMeta] = useState({
    businessName: '',
    verificationStatus: '',
    updatedAt: ''
  });

  const updateSection = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const fetchSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.get(`/sellers/${user.id}`);
      const seller = response.data?.seller || {};
      const draftSettings = readSettingsDraft(user.id);

      setSettings({
        ...draftSettings,
        notifications: {
          ...draftSettings.notifications,
          notifications: seller?.preferences?.notifications ?? draftSettings.notifications.notifications,
          autoAcceptOrders: seller?.preferences?.autoAcceptOrders ?? draftSettings.notifications.autoAcceptOrders,
          language: seller?.preferences?.language || draftSettings.notifications.language
        }
      });

      setMeta({
        businessName: seller?.businessName || '',
        verificationStatus: seller?.verificationStatus || 'pending',
        updatedAt: seller?.updatedAt || ''
      });
      setHasChanges(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      writeSettingsDraft(user.id, settings);

      const response = await api.put(`/sellers/${user.id}`, {
        preferences: {
          notifications: settings.notifications.notifications,
          autoAcceptOrders: settings.notifications.autoAcceptOrders,
          language: settings.notifications.language
        }
      });

      const seller = response.data?.seller || {};
      setMeta({
        businessName: seller?.businessName || meta.businessName,
        verificationStatus: seller?.verificationStatus || meta.verificationStatus,
        updatedAt: seller?.updatedAt || meta.updatedAt
      });

      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    const reset = createDefaultSettings();
    setSettings(reset);
    writeSettingsDraft(user?.id, reset);
    setHasChanges(true);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'shipping', label: 'Shipping', icon: TruckIcon },
    { id: 'payment', label: 'Payment', icon: CreditCardIcon },
    { id: 'store', label: 'Store Controls', icon: GlobeAltIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">Live seller preferences stay synced to your account. Restored advanced sections are kept as drafts on this device until backend endpoints are added.</p>
        </div>
        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Business</p>
          <p className="mt-1 font-semibold text-gray-900">{meta.businessName || 'Not set'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Verification</p>
          <p className="mt-1 font-semibold capitalize text-gray-900">{meta.verificationStatus || 'pending'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="mt-1 font-semibold text-gray-900">
            {meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : 'Not available'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        `Notifications`, `Auto Accept Orders`, and `Preferred Language` save to your account. The restored privacy, shipping, payment, store, and analytics controls save as seller drafts on this device for now.
      </div>

      <div className="rounded-lg bg-white shadow-md">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
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

        <div className="space-y-6 p-6">
        {activeTab === 'notifications' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>
          <ToggleRow
            label="Platform Notifications"
            description="Live account setting synced to the backend."
            checked={settings.notifications.notifications}
            onChange={(value) => updateSection('notifications', 'notifications', value)}
          />
          <ToggleRow
            label="Auto Accept Orders"
            description="Live seller preference synced to the backend."
            checked={settings.notifications.autoAcceptOrders}
            onChange={(value) => updateSection('notifications', 'autoAcceptOrders', value)}
          />
          <ToggleRow
            label="New Messages"
            description="Draft-only restored setting."
            checked={settings.notifications.newMessages}
            onChange={(value) => updateSection('notifications', 'newMessages', value)}
          />
          <ToggleRow
            label="Low Stock Alerts"
            description="Draft-only restored setting."
            checked={settings.notifications.lowStock}
            onChange={(value) => updateSection('notifications', 'lowStock', value)}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow
              label="Weekly Reports"
              checked={settings.notifications.weeklyReports}
              onChange={(value) => updateSection('notifications', 'weeklyReports', value)}
            />
            <ToggleRow
              label="Monthly Reports"
              checked={settings.notifications.monthlyReports}
              onChange={(value) => updateSection('notifications', 'monthlyReports', value)}
            />
            <ToggleRow
              label="System Updates"
              checked={settings.notifications.systemUpdates}
              onChange={(value) => updateSection('notifications', 'systemUpdates', value)}
            />
            <ToggleRow
              label="Security Alerts"
              checked={settings.notifications.securityAlerts}
              onChange={(value) => updateSection('notifications', 'securityAlerts', value)}
            />
          </div>
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Language</label>
            <select
              value={settings.notifications.language}
              onChange={(e) => updateSection('notifications', 'language', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="ny">Nyanja</option>
              <option value="bem">Bemba</option>
            </select>
          </div>
        </section>
        )}

        {activeTab === 'privacy' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Privacy & Security</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow label="Show Email Address" checked={settings.privacy.showEmail} onChange={(value) => updateSection('privacy', 'showEmail', value)} />
            <ToggleRow label="Show Phone Number" checked={settings.privacy.showPhone} onChange={(value) => updateSection('privacy', 'showPhone', value)} />
            <ToggleRow label="Show Business Address" checked={settings.privacy.showAddress} onChange={(value) => updateSection('privacy', 'showAddress', value)} />
            <ToggleRow label="Allow Customer Messages" checked={settings.privacy.allowMessages} onChange={(value) => updateSection('privacy', 'allowMessages', value)} />
          </div>
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-gray-700">Profile Visibility</label>
            <select
              value={settings.privacy.profileVisibility}
              onChange={(e) => updateSection('privacy', 'profileVisibility', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public</option>
              <option value="customers">Customers Only</option>
              <option value="private">Private</option>
            </select>
          </div>
        </section>
        )}

        {activeTab === 'shipping' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Shipping</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <input type="number" value={settings.shipping.freeShippingThreshold} onChange={(e) => updateSection('shipping', 'freeShippingThreshold', Number(e.target.value))} placeholder="Free shipping threshold" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
            <input type="number" value={settings.shipping.standardShippingRate} onChange={(e) => updateSection('shipping', 'standardShippingRate', Number(e.target.value))} placeholder="Standard shipping rate" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
            <input type="number" value={settings.shipping.expeditedShippingRate} onChange={(e) => updateSection('shipping', 'expeditedShippingRate', Number(e.target.value))} placeholder="Expedited shipping rate" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow label="International Shipping" checked={settings.shipping.internationalShipping} onChange={(value) => updateSection('shipping', 'internationalShipping', value)} />
            <ToggleRow label="Auto Accept Returns" checked={settings.shipping.autoAcceptReturns} onChange={(value) => updateSection('shipping', 'autoAcceptReturns', value)} />
          </div>
        </section>
        )}

        {activeTab === 'payment' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <select value={settings.payment.paymentMethod} onChange={(e) => updateSection('payment', 'paymentMethod', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
            </select>
            <select value={settings.payment.payoutSchedule} onChange={(e) => updateSection('payment', 'payoutSchedule', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input type="number" value={settings.payment.minimumPayout} onChange={(e) => updateSection('payment', 'minimumPayout', Number(e.target.value))} placeholder="Minimum payout" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>
        </section>
        )}

        {activeTab === 'store' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Store Controls</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow label="Maintenance Mode" checked={settings.store.maintenanceMode} onChange={(value) => updateSection('store', 'maintenanceMode', value)} />
            <ToggleRow label="Vacation Mode" checked={settings.store.vacationMode} onChange={(value) => updateSection('store', 'vacationMode', value)} />
            <ToggleRow label="Auto Reply" checked={settings.store.autoReply} onChange={(value) => updateSection('store', 'autoReply', value)} />
            <ToggleRow label="Allow Backorders" checked={settings.store.allowBackorders} onChange={(value) => updateSection('store', 'allowBackorders', value)} />
          </div>
          <textarea
            value={settings.store.vacationMessage}
            onChange={(e) => updateSection('store', 'vacationMessage', e.target.value)}
            rows={3}
            placeholder="Vacation message"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={settings.store.autoReplyMessage}
            onChange={(e) => updateSection('store', 'autoReplyMessage', e.target.value)}
            rows={3}
            placeholder="Auto reply message"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </section>
        )}

        {activeTab === 'analytics' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Analytics Preferences</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow label="Share Data With Google" checked={settings.analytics.shareDataWithGoogle} onChange={(value) => updateSection('analytics', 'shareDataWithGoogle', value)} />
            <ToggleRow label="Track Customer Behavior" checked={settings.analytics.trackCustomerBehavior} onChange={(value) => updateSection('analytics', 'trackCustomerBehavior', value)} />
            <ToggleRow label="Enable Heatmaps" checked={settings.analytics.enableHeatmaps} onChange={(value) => updateSection('analytics', 'enableHeatmaps', value)} />
            <ToggleRow label="Allow Third-Party Analytics" checked={settings.analytics.allowThirdPartyAnalytics} onChange={(value) => updateSection('analytics', 'allowThirdPartyAnalytics', value)} />
          </div>
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-gray-700">Data Retention Period</label>
            <select
              value={settings.analytics.dataRetentionPeriod}
              onChange={(e) => updateSection('analytics', 'dataRetentionPeriod', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="6_months">6 months</option>
              <option value="1_year">1 year</option>
              <option value="2_years">2 years</option>
              <option value="5_years">5 years</option>
              <option value="indefinite">Indefinite</option>
            </select>
          </div>
        </section>
        )}
        </div>
      </div>

      {hasChanges && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleResetSettings}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckIcon className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SellerSettings;
