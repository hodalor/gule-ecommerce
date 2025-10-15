import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BellIcon,
  EnvelopeIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { updateNotificationSettings } from '../../store/slices/notificationSlice';

const NotificationSettings = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { settings, loading } = useSelector((state) => state.notifications);
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleToggle = (category, setting) => {
    const newSettings = {
      ...localSettings,
      [category]: {
        ...localSettings[category],
        [setting]: !localSettings[category][setting]
      }
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (field, value) => {
    const newSettings = {
      ...localSettings,
      quietHours: {
        ...localSettings.quietHours,
        [field]: value
      }
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await dispatch(updateNotificationSettings(localSettings)).unwrap();
      setHasChanges(false);
      // Show success message
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Show error message
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  if (!isOpen) return null;

  const notificationTypes = [
    {
      key: 'orders',
      label: 'Order Updates',
      description: 'New orders, status changes, cancellations',
      icon: <BellIcon className="h-5 w-5" />
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Customer messages, support tickets',
      icon: <EnvelopeIcon className="h-5 w-5" />
    },
    {
      key: 'inventory',
      label: 'Inventory Alerts',
      description: 'Low stock, out of stock warnings',
      icon: <CogIcon className="h-5 w-5" />
    },
    {
      key: 'payments',
      label: 'Payment Notifications',
      description: 'Payment confirmations, refunds, disputes',
      icon: <BellIcon className="h-5 w-5" />
    },
    {
      key: 'reviews',
      label: 'Reviews & Ratings',
      description: 'New reviews, rating updates',
      icon: <BellIcon className="h-5 w-5" />
    },
    {
      key: 'system',
      label: 'System Updates',
      description: 'Platform updates, maintenance notices',
      icon: <CogIcon className="h-5 w-5" />
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* General Settings */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-900 mb-4">General Settings</h3>
            <div className="space-y-4">
              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications in your browser</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.push}
                    onChange={() => handleToggle('', 'push')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.email}
                    onChange={() => handleToggle('', 'email')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Sound Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {localSettings.sound ? (
                    <SpeakerWaveIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <SpeakerXMarkIcon className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sound Notifications</p>
                    <p className="text-xs text-gray-500">Play sound for new notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.sound}
                    onChange={() => handleToggle('', 'sound')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Types</h3>
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {type.icon}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{type.label}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.types[type.key]}
                        onChange={() => handleToggle('types', type.key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Quiet Hours</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enable Quiet Hours</p>
                    <p className="text-xs text-gray-500">Disable notifications during specified hours</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.quietHours.enabled}
                    onChange={() => handleQuietHoursChange('enabled', !localSettings.quietHours.enabled)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {localSettings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={localSettings.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={localSettings.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;