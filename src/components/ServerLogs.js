import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ServerIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import socketService from '../utils/socket';

const levelStyles = {
  error: 'bg-red-100 text-red-700 border-red-200',
  warn: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  debug: 'bg-slate-100 text-slate-700 border-slate-200'
};

const ServerLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false
  });
  const [statistics, setStatistics] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [filters, setFilters] = useState({
    level: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError('');

      const params = {
        ...filters,
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset
      };

      const response = await api.get('/admin/server-logs', { params });
      
      if (response.data.success) {
        if (reset) {
          setLogs(response.data.data.logs);
          setPagination(prev => ({
            ...prev,
            offset: 0,
            total: response.data.data.pagination.total,
            hasMore: response.data.data.pagination.hasMore
          }));
        } else {
          setLogs(prev => [...prev, ...response.data.data.logs]);
          setPagination(prev => ({
            ...prev,
            offset: response.data.data.pagination.offset,
            total: response.data.data.pagination.total,
            hasMore: response.data.data.pagination.hasMore
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching server logs:', error);
      setError(error.response?.data?.error || 'Failed to fetch server logs');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await api.get('/admin/server-logs/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);
    fetchStatistics();
  }, [fetchLogs, fetchStatistics]);

  useEffect(() => {
    socketService.connect();

    const handleLogUpdate = (logData) => {
      if (filters.level === 'all' || filters.level === logData.level) {
        setLogs(prevLogs => {
          const exists = prevLogs.some(log => 
            log.timestamp === logData.timestamp && 
            log.message === logData.message
          );
          
          if (!exists) {
            return [logData, ...prevLogs.slice(0, 49)];
          }
          return prevLogs;
        });
        fetchStatistics();
      }
    };

    socketService.onLogUpdate(handleLogUpdate);

    return () => {
      socketService.offLogUpdate(handleLogUpdate);
    };
  }, [filters.level, fetchStatistics]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const intervalId = window.setInterval(() => {
      fetchLogs(true);
      fetchStatistics();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, fetchLogs, fetchStatistics]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  useEffect(() => {
    if (pagination.offset > 0) {
      fetchLogs(false);
    }
  }, [pagination.offset, fetchLogs]);

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleDownload = async (logType) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/server-logs/download/${logType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${logType}-logs-${format(new Date(), 'yyyy-MM-dd')}.log`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(`${logType} logs downloaded successfully`);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to download logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async (logType, createBackup = true) => {
    try {
      setLoading(true);
      const response = await api.delete('/admin/server-logs/clear', {
        data: { logType, createBackup }
      });
      
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchLogs(true);
        fetchStatistics();
        setClearDialogOpen(false);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to clear logs');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return timestamp;
    }
  };

  const getLevelClass = (level) => levelStyles[level?.toLowerCase()] || levelStyles.debug;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white">
              <ServerIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Server Logs</h1>
              <p className="mt-1 text-sm text-slate-500">Monitor live backend activity, download logs, and clear files with backup support.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600"
            />
            Auto refresh
          </label>
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={loading}
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setClearDialogOpen(true)}
            className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Clear Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="mt-0.5 h-5 w-5" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Logs', value: statistics?.totalLogs, tone: 'text-slate-900' },
            { label: 'Error Logs', value: statistics?.errorLogs, tone: 'text-red-600' },
            { label: 'Warning Logs', value: statistics?.warningLogs, tone: 'text-amber-600' },
            { label: 'Info Logs', value: statistics?.infoLogs, tone: 'text-blue-600' }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-black ${stat.tone}`}>{stat.value?.toLocaleString() || '0'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_minmax(0,1fr)_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Log Level</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search messages, services, or sources"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => handleDownload('combined')}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Combined
            </button>
            <button
              type="button"
              onClick={() => handleDownload('error')}
              className="inline-flex items-center rounded-full border border-red-300 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Errors
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">End Date</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Server Logs ({pagination?.total?.toLocaleString() || '0'} total)
            </h2>
            {autoRefresh && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {logs.map((log, index) => (
                  <tr key={log.id || `${log.timestamp}-${index}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${getLevelClass(log.level)}`}>
                        {log.level || 'info'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.source || 'system'}</td>
                    <td className="max-w-xl px-4 py-3 text-sm text-slate-700">
                      <div className="truncate font-mono">{log.message}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.service || 'gule-backend'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(log)}
                        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <EyeIcon className="mr-1 h-4 w-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-center text-sm font-medium text-slate-500">Loading logs...</div>
        )}

        {pagination.hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Load More
            </button>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">No server logs found.</p>
          </div>
        )}
      </div>

      {detailsOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">Log Details</h3>
              <button type="button" onClick={() => setDetailsOpen(false)}>
                <XMarkIcon className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</p>
                <p className="mt-2 font-mono text-sm text-slate-800">{formatTimestamp(selectedLog.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level</p>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${getLevelClass(selectedLog.level)}`}>
                  {selectedLog.level || 'info'}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                <p className="mt-2 text-sm text-slate-800">{selectedLog.source || 'system'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service</p>
                <p className="mt-2 text-sm text-slate-800">{selectedLog.service || 'gule-backend'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
                <div className="mt-2 rounded-2xl bg-slate-50 p-4 font-mono text-sm text-slate-800 whitespace-pre-wrap">
                  {selectedLog.message}
                </div>
              </div>
              {selectedLog.stack && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stack Trace</p>
                  <div className="mt-2 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100 whitespace-pre-wrap">
                    {selectedLog.stack}
                  </div>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</p>
                  <div className="mt-2 rounded-2xl bg-slate-50 p-4">
                    <pre className="overflow-auto text-xs text-slate-800">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {clearDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Clear Server Logs</h3>
              <button type="button" onClick={() => setClearDialogOpen(false)}>
                <XMarkIcon className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Are you sure you want to clear the server logs? This action cannot be undone.
            </p>
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              A backup will be created before clearing the logs.
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearDialogOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleClearLogs('error', true)}
                className="rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                Clear Error Logs
              </button>
              <button
                type="button"
                onClick={() => handleClearLogs('all', true)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerLogs;
