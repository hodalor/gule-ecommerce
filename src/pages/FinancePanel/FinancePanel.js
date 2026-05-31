import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTransactions,
  generateFinancialReport,
  fetchFinancialSummary
} from '../../store/slices/financeSlice';
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const FinancePanel = () => {
  const dispatch = useDispatch();
  const { transactions, financialSummary, reportData } = useSelector((state) => state.finance);
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: CurrencyDollarIcon },
    { id: 'transactions', name: 'Transactions', icon: ArrowUpIcon },
    { id: 'reports', name: 'Reports', icon: DocumentArrowDownIcon }
  ];

  const transactionStatuses = ['pending', 'completed', 'failed', 'cancelled'];

  useEffect(() => {
    dispatch(fetchTransactions({
      page: 1,
      limit: 20,
      status: statusFilter || undefined,
      dateRange: dateRange.start && dateRange.end
        ? { startDate: dateRange.start, endDate: dateRange.end }
        : undefined
    }));
    dispatch(fetchFinancialSummary({ period: 'month' }));
  }, [dateRange, dispatch, statusFilter]);

  const handleGenerateReport = (period) => {
    dispatch(generateFinancialReport({
      period,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined
    }));
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term
      || String(transaction.reference || '').toLowerCase().includes(term)
      || String(transaction.buyerName || '').toLowerCase().includes(term)
      || String(transaction.sellerName || '').toLowerCase().includes(term)
      || String(transaction.description || '').toLowerCase().includes(term);
    const matchesStatus = !statusFilter || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManageFinance = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'accountant';

  if (!canManageFinance) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <CurrencyDollarIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don&apos;t have permission to access financial data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Panel</h1>
        <p className="text-gray-600">Live finance data from transactions and report summaries.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-5">
                  <p className="text-sm text-gray-500">Completed Sales</p>
                  <p className="text-lg font-medium text-gray-900">ZMW {Number(financialSummary?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <ArrowUpIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-5">
                  <p className="text-sm text-gray-500">Pending Payouts</p>
                  <p className="text-lg font-medium text-gray-900">ZMW {Number(financialSummary?.pendingReleases || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <ArrowDownIcon className="h-8 w-8 text-red-600" />
                <div className="ml-5">
                  <p className="text-sm text-gray-500">Completed Refunds</p>
                  <p className="text-lg font-medium text-gray-900">ZMW {Number(financialSummary?.totalRefunds || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-5">
                  <p className="text-sm text-gray-500">Transactions Loaded</p>
                  <p className="text-lg font-medium text-gray-900">{transactions.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Financial Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`rounded-full p-2 ${transaction.type === 'sale' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {transaction.type === 'sale'
                          ? <ArrowUpIcon className="h-4 w-4 text-green-600" />
                          : <ArrowDownIcon className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'sale' ? '+' : '-'} {transaction.currency} {transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-sm capitalize text-gray-500">{transaction.status}</p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-sm text-gray-500">No transactions available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {transactionStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">#{transaction.reference}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          transaction.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {transaction.currency} {transaction.amount.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{transaction.buyerName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{transaction.sellerName}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Generate Financial Reports</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                onClick={() => handleGenerateReport('weekly')}
                className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                Weekly Report
              </button>
              <button
                onClick={() => handleGenerateReport('monthly')}
                className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                Monthly Report
              </button>
              <button
                onClick={() => handleGenerateReport('yearly')}
                className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                Yearly Report
              </button>
            </div>
          </div>

          {reportData && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Latest Report Summary</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Completed Sales</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    ZMW {Number(reportData.summary?.sale?.completed || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Pending Payouts</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    ZMW {Number(reportData.summary?.payout?.pending || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Completed Refunds</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    ZMW {Number(reportData.summary?.refund?.completed || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancePanel;
