import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const FeaturedRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Try backend endpoint if available
        const { data } = await api.get('/admin/featured-requests');
        if (isMounted) setRequests(Array.isArray(data?.requests) ? data.requests : []);
      } catch (err) {
        // Fallback: local storage (may be empty across different ports)
        try {
          const raw = localStorage.getItem('sellerFeatureRequests');
          const ids = raw ? JSON.parse(raw) : [];
          const normalized = Array.isArray(ids) ? ids : [];
          if (isMounted) setRequests(normalized.map((id) => ({ id, productId: id, status: 'pending', requestedAt: new Date().toISOString() })));
        } catch {
          if (isMounted) setRequests([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const updateStatus = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id || r.productId === id) ? { ...r, status } : r));
  };

  const handleApprove = async (id) => {
    try {
      // Attempt backend call if implemented
      await api.post(`/admin/featured-requests/${id}/approve`);
      updateStatus(id, 'approved');
      toast.success('Feature request approved');
    } catch {
      updateStatus(id, 'approved');
      toast.success('Approved (local only, backend not connected)');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/admin/featured-requests/${id}/reject`);
      updateStatus(id, 'rejected');
      toast.success('Feature request rejected');
    } catch {
      updateStatus(id, 'rejected');
      toast.success('Rejected (local only, backend not connected)');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Featured Requests</h1>
        <p className="text-sm text-gray-600">Review and approve seller product feature requests.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No feature requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (ZMW/day)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (ZMW)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id || req.productId}>
                  <td className="px-6 py-4 text-sm text-gray-900">{req.id || req.productId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{req.productId || req.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(req.requestedAt || Date.now()).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{req.days || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{req.ratePerDay ?? 5}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{req.amount ?? ((req.days || 0) * (req.ratePerDay ?? 5))}</td>
                  <td className="px-6 py-4 text-sm">
                    {req.paymentRequired ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">{req.payment?.status === 'paid' ? 'Paid' : 'Pending'}</span>
                        <span className="text-gray-600">{req.payment?.method === 'card' ? 'Card' : (req.payment?.method === 'mobile_money' ? 'Mobile Money' : 'Unknown')}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">Not Required</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      req.status === 'approved' ? 'bg-green-100 text-green-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(req.id || req.productId)} className="px-3 py-1 rounded border border-green-600 text-green-600 hover:bg-green-50 text-sm">Approve</button>
                      <button onClick={() => handleReject(req.id || req.productId)} className="px-3 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50 text-sm">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeaturedRequests;
