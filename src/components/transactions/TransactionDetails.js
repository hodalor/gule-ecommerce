import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import {
  fetchTransactionById,
  updateTransactionStatus,
  processRefund,
  cancelTransaction,
  addTransactionNote
} from '../../store/slices/transactionSlice';
import toast from 'react-hot-toast';

const TransactionDetails = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const {
    currentTransaction,
    loading,
    error,
    actionLoading
  } = useSelector((state) => state.transactions);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (transactionId) {
      dispatch(fetchTransactionById(transactionId));
    }
  }, [dispatch, transactionId]);

  const handleStatusUpdate = async () => {
    try {
      await dispatch(updateTransactionStatus({
        transactionId: currentTransaction._id,
        status: newStatus,
        notes: statusNotes
      })).unwrap();
      toast.success('Transaction status updated successfully');
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
    } catch (error) {
      toast.error(error || 'Failed to update transaction status');
    }
  };

  const handleRefund = async () => {
    try {
      await dispatch(processRefund({
        transactionId: currentTransaction._id,
        amount: parseFloat(refundAmount),
        reason: refundReason
      })).unwrap();
      toast.success('Refund processed successfully');
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
    } catch (error) {
      toast.error(error || 'Failed to process refund');
    }
  };

  const handleCancel = async () => {
    try {
      await dispatch(cancelTransaction({
        transactionId: currentTransaction._id,
        reason: 'Cancelled by admin'
      })).unwrap();
      toast.success('Transaction cancelled successfully');
    } catch (error) {
      toast.error(error || 'Failed to cancel transaction');
    }
  };

  const handleAddNote = async () => {
    try {
      await dispatch(addTransactionNote({
        transactionId: currentTransaction._id,
        note: newNote
      })).unwrap();
      toast.success('Note added successfully');
      setShowNoteModal(false);
      setNewNote('');
    } catch (error) {
      toast.error(error || 'Failed to add note');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      case 'refunded':
        return <ArrowPathIcon className="h-6 w-6 text-blue-500" />;
      case 'cancelled':
        return <XMarkIcon className="h-6 w-6 text-gray-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'refunded':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTransaction) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Transaction not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The transaction you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/transactions')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
              <p className="mt-1 text-sm text-gray-500">
                Transaction ID: {currentTransaction.transactionId || currentTransaction._id}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => copyToClipboard(currentTransaction.transactionId || currentTransaction._id)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
              Copy ID
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Transaction Overview</h2>
              <div className="flex items-center space-x-3">
                {getStatusIcon(currentTransaction.status)}
                <span className={getStatusBadge(currentTransaction.status)}>
                  {currentTransaction.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Transaction Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Amount</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(currentTransaction.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Type</dt>
                    <dd className="text-sm text-gray-700 capitalize">
                      {currentTransaction.type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Payment Method</dt>
                    <dd className="text-sm text-gray-700">
                      {currentTransaction.paymentMethod || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Gateway</dt>
                    <dd className="text-sm text-gray-700">
                      {currentTransaction.gateway || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Timestamps</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Created</dt>
                    <dd className="text-sm text-gray-700">
                      {formatDate(currentTransaction.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Updated</dt>
                    <dd className="text-sm text-gray-700">
                      {formatDate(currentTransaction.updatedAt)}
                    </dd>
                  </div>
                  {currentTransaction.completedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Completed</dt>
                      <dd className="text-sm text-gray-700">
                        {formatDate(currentTransaction.completedAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {currentTransaction.refundAmount > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <ArrowPathIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Refund Information</h3>
                    <div className="mt-1 text-sm text-blue-700">
                      <p>Refunded Amount: {formatCurrency(currentTransaction.refundAmount)}</p>
                      {currentTransaction.refundReason && (
                        <p>Reason: {currentTransaction.refundReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Information */}
          {currentTransaction.user && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentTransaction.user.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">Customer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentTransaction.user.email}
                    </p>
                    <p className="text-sm text-gray-500">Email</p>
                  </div>
                </div>
                {currentTransaction.user.phone && (
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {currentTransaction.user.phone}
                      </p>
                      <p className="text-sm text-gray-500">Phone</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Information */}
          {currentTransaction.order && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Order Information</h2>
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-900">Order ID</dt>
                  <dd className="text-sm text-gray-700">
                    {currentTransaction.order.orderId || currentTransaction.order._id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">Order Status</dt>
                  <dd className="text-sm text-gray-700 capitalize">
                    {currentTransaction.order.status}
                  </dd>
                </div>
                {currentTransaction.order.items && (
                  <div>
                    <dt className="text-sm font-medium text-gray-900 mb-2">Items</dt>
                    <dd className="space-y-2">
                      {currentTransaction.order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.product?.name || item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Transaction History</h2>
            <div className="flow-root">
              <ul className="-mb-8">
                {currentTransaction.history?.map((event, eventIdx) => (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== currentTransaction.history.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                            <CalendarIcon className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              {event.action} <span className="font-medium text-gray-900">{event.status}</span>
                            </p>
                            {event.notes && (
                              <p className="mt-1 text-sm text-gray-600">{event.notes}</p>
                            )}
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(event.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Notes</h2>
              <button
                onClick={() => setShowNoteModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                Add Note
              </button>
            </div>
            
            {currentTransaction.notes && currentTransaction.notes.length > 0 ? (
              <div className="space-y-4">
                {currentTransaction.notes.map((note, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-900">{note.content}</p>
                      <span className="text-xs text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    {note.author && (
                      <p className="mt-2 text-xs text-gray-500">
                        By: {note.author.name || note.author.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No notes available for this transaction.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {currentTransaction.status === 'pending' && (
                <>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Update Status
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel Transaction
                  </button>
                </>
              )}
              
              {currentTransaction.status === 'completed' && !currentTransaction.refundAmount && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Process Refund
                </button>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Gateway Transaction ID</dt>
                <dd className="text-sm text-gray-900">
                  {currentTransaction.gatewayTransactionId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Gateway Response</dt>
                <dd className="text-sm text-gray-900">
                  {currentTransaction.gatewayResponse || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Processing Fee</dt>
                <dd className="text-sm text-gray-900">
                  {currentTransaction.processingFee ? formatCurrency(currentTransaction.processingFee) : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Risk Assessment */}
          {currentTransaction.riskScore && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Risk Score</span>
                    <span className="text-sm text-gray-900">{currentTransaction.riskScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        currentTransaction.riskScore < 30 ? 'bg-green-600' :
                        currentTransaction.riskScore < 70 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${currentTransaction.riskScore}%` }}
                    ></div>
                  </div>
                </div>
                {currentTransaction.riskFactors && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Risk Factors</dt>
                    <dd className="text-sm text-gray-900">
                      {currentTransaction.riskFactors.join(', ')}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Transaction Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select status</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add any notes about this status change..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || actionLoading.updateStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading.updateStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Process Refund
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={currentTransaction.amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={`Max: ${formatCurrency(currentTransaction.amount)}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Reason for refund..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundAmount || !refundReason || actionLoading.refund}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading.refund ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Note
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    rows={4}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add your note here..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote || actionLoading.addNote}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading.addNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetails;