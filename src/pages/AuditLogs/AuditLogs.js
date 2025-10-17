import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAuditLogs,
  fetchAuditLogDetails,
  exportAuditLogs,
  fetchAuditStats,
  setFilters,
  clearFilters,
  setCurrentPage,
  setPageSize,
  setSelectedLog,
  clearSelectedLog
} from '../../store/slices/auditSlice';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  EyeIcon,
  UserIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import socketService from '../../utils/socket';

const AuditLogs = () => {
  const dispatch = useDispatch();
  const { 
    logs, 
    loading, 
    error, 
    totalCount,
    currentPage 
  } = useSelector((state) => state.audit);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const intervalRef = useRef(null);

  // Updated action types based on the AuditLog model
  const actionTypes = [
    'login', 'logout', 'create', 'update', 'delete', 
    'approve', 'reject', 'assign', 'release_funds', 
    'refund', 'export', 'import', 'settings_change',
    'user_login', 'user_logout', 'invalid_login'
  ];

  // Updated severity levels based on the AuditLog model
  const severityLevels = ['low', 'medium', 'high', 'critical'];

  // Real-time data fetching
  const fetchLatestLogs = () => {
    const filters = {
      search: searchTerm,
      action: actionFilter,
      user: userFilter,
      startDate: dateRange.start,
      endDate: dateRange.end,
      severity: severityFilter,
      page: currentPage,
      limit: 20
    };
    dispatch(fetchAuditLogs(filters));
    setLastRefresh(new Date());
  };

  // Set up real-time polling
  useEffect(() => {
    if (isRealTimeEnabled) {
      // Initial fetch
      fetchLatestLogs();
      
      // Set up polling every 30 seconds
      intervalRef.current = setInterval(() => {
        fetchLatestLogs();
      }, 30000);
    } else {
      // Clear interval if real-time is disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRealTimeEnabled, searchTerm, actionFilter, userFilter, dateRange, severityFilter, currentPage]);

  // WebSocket real-time updates
  useEffect(() => {
    if (isRealTimeEnabled) {
      // Connect to WebSocket
      socketService.connect();

      // Handle real-time audit log updates
      const handleAuditLogUpdate = (auditData) => {
        console.log('Received real-time audit log update:', auditData);
        
        // Refresh the audit logs to include the new entry
        fetchLatestLogs();
        setLastRefresh(new Date());
      };

      socketService.onAuditLogUpdate(handleAuditLogUpdate);

      return () => {
        socketService.offAuditLogUpdate(handleAuditLogUpdate);
      };
    }
  }, [isRealTimeEnabled]);

  // Manual refresh
  const handleManualRefresh = () => {
    fetchLatestLogs();
  };

  // Toggle real-time updates
  const toggleRealTime = () => {
    setIsRealTimeEnabled(!isRealTimeEnabled);
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log._id || log.id));
    }
  };

  const handleExportLogs = () => {
    const filters = {
      search: searchTerm,
      action: actionFilter,
      user: userFilter,
      startDate: dateRange.start,
      endDate: dateRange.end,
      severity: severityFilter
    };
    dispatch(exportAuditLogs({ format: 'csv', filters }));
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear selected audit logs? This action cannot be undone.')) {
      setSelectedLogs([]);
      console.log('Clear logs functionality not implemented yet');
    }
  };

  const handleViewLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  const getActionIcon = (action) => {
    const actionLower = action?.toLowerCase();
    switch (actionLower) {
      case 'create':
      case 'update':
      case 'delete':
      case 'settings_change':
        return <CogIcon className="h-4 w-4" />;
      case 'login':
      case 'logout':
      case 'user_login':
      case 'user_logout':
      case 'invalid_login':
        return <UserIcon className="h-4 w-4" />;
      case 'approve':
      case 'reject':
        return <ShieldCheckIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    const severityLower = severity?.toLowerCase();
    switch (severityLower) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const canViewAuditLogs = user?.role === 'super_admin' || user?.role === 'admin';

  if (!canViewAuditLogs) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <ShieldCheckIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Track all admin and system actions</p>
          <div className="flex items-center mt-2 space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isRealTimeEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-500">
                {isRealTimeEnabled ? 'Real-time updates enabled' : 'Real-time updates disabled'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Last updated: {formatTimestamp(lastRefresh)}
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={toggleRealTime}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              isRealTimeEnabled 
                ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isRealTimeEnabled ? 'animate-spin' : ''}`} />
            {isRealTimeEnabled ? 'Disable Real-time' : 'Enable Real-time'}
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={handleExportLogs}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          {selectedLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear Selected
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading audit logs</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search audit logs by action, user, or description..."
            className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All Actions</option>
                {actionTypes.map(action => (
                  <option key={action} value={action}>{action.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User
              </label>
              <input
                type="text"
                placeholder="Enter user email or ID"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="">All Severities</option>
                {severityLevels.map(level => (
                  <option key={level} value={level}>{level.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => {
                setSearchTerm('');
                setActionFilter('');
                setUserFilter('');
                setDateRange({ start: '', end: '' });
                setSeverityFilter('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
            <p className="text-sm text-gray-500">
              {totalCount || logs.length} total entries
              {loading && <span className="ml-2 text-blue-600">Loading...</span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLogs.length === logs.length && logs.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-500">Select All</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log._id || log.id)}
                        onChange={() => handleSelectLog(log._id || log.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp || log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100">
                          {getActionIcon(log.action || log.actionType)}
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">
                            {(log.action || log.actionType || 'Unknown').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.performedBy?.email || log.userName || log.performedBy || 'System'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.performedBy?.role || log.userRole || log.userType || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.description || 'No description available'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                        {(log.severity || 'medium').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {log.ipAddress || log.sessionInfo?.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewLogDetails(log)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Loading audit logs...' : 'No audit logs found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp || selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedLog.action || selectedLog.actionType || 'Unknown').toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.performedBy?.email || selectedLog.userName || selectedLog.performedBy || 'System'} 
                      ({selectedLog.performedBy?.role || selectedLog.userRole || selectedLog.userType || 'N/A'})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(selectedLog.severity)}`}>
                      {(selectedLog.severity || 'medium').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm font-mono text-gray-900">{selectedLog.ipAddress || selectedLog.sessionInfo?.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <p className="mt-1 text-sm text-gray-900 truncate" title={selectedLog.userAgent || selectedLog.sessionInfo?.userAgent}>
                      {selectedLog.userAgent || selectedLog.sessionInfo?.userAgent || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Module</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.module || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.status || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.description || 'No description available'}</p>
                </div>
                
                {(selectedLog.metadata || selectedLog.sessionInfo) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Data</label>
                    <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify({
                        metadata: selectedLog.metadata,
                        sessionInfo: selectedLog.sessionInfo,
                        ...(selectedLog.errorDetails && { errorDetails: selectedLog.errorDetails })
                      }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;