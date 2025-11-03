import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdmins } from '../../store/slices/adminSlice';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, PencilIcon, EyeIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const roleOptions = [
  'Super Admin',
  'Admin',
  'Accountant',
  'Review Officer',
  'Customer Support',
  'Marketing Manager'
];

const AdminRow = ({ admin, onView, onEdit, onDelete, onResetPassword, onChangePassword }) => {
  const name = useMemo(() => {
    const first = admin.firstName || admin.name || '';
    const last = admin.lastName || '';
    return `${first} ${last}`.trim() || '—';
  }, [admin]);

  const role = admin.role || admin?.employment?.jobTitle || '—';
  const email = admin.email || '—';
  const phone = admin.phone || admin?.contact?.phone || '—';

  return (
    <tr className="bg-white">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phone}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{role?.replace('_', ' ')}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <button onClick={() => onView(admin)} className="inline-flex items-center px-2 py-1 border rounded text-gray-700 hover:bg-gray-50">
          <EyeIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onEdit(admin)} className="inline-flex items-center px-2 py-1 border rounded text-gray-700 hover:bg-gray-50">
          <PencilIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onResetPassword(admin)} className="inline-flex items-center px-2 py-1 border rounded text-orange-600 hover:bg-orange-50">
          <KeyIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onChangePassword(admin)} className="inline-flex items-center px-2 py-1 border rounded text-blue-600 hover:bg-blue-50">
          <KeyIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(admin)} className="inline-flex items-center px-2 py-1 border rounded text-red-600 hover:bg-red-50">
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};

const AdminManagement = () => {
  const dispatch = useDispatch();
  const { admins, loading, totalCount } = useSelector((state) => state.admin || {});

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Password reset states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchAdmins({ page: 1, limit: 10, search: searchTerm, role: roleFilter }));
  }, [dispatch, searchTerm, roleFilter]);

  const handleAddAdmin = () => {
    setSelectedAdmin(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleView = (admin) => {
    setSelectedAdmin(admin);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = (admin) => {
    setSelectedAdmin(admin);
    // Wire delete thunk next
  };

  // Password reset handlers
  const handleResetPassword = async (admin) => {
    if (!admin.email) {
      toast.error('Admin email is missing.');
      return;
    }
    if (!window.confirm(`Send password reset email to ${admin.email}?`)) return;
    try {
      await api.post('/auth/forgot-password', { email: admin.email, userType: 'admin' });
      toast.success('Reset email sent if the account exists.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
    }
  };

  const openPasswordModal = (admin) => {
    setSelectedAdmin(admin);
    setPasswordForm({ password: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const submitManualPassword = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.post('/auth/admin/reset-user-password', {
        userId: selectedAdmin.id,
        userType: 'admin',
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Failed to update password';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600">Manage platform administrators and permissions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAddAdmin}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Admin
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email"
              className="pl-10 pr-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading admins…</td>
              </tr>
            )}
            {!loading && admins && admins.length > 0 && admins.map((admin) => (
              <AdminRow key={admin.id || admin._id || admin.email} admin={admin} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} onResetPassword={handleResetPassword} onChangePassword={openPasswordModal} />
            ))}
            {!loading && (!admins || admins.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <div className="text-gray-500">No admins found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 text-sm text-gray-500 bg-gray-50">
          Total: {totalCount || (admins ? admins.length : 0)}
        </div>
      </div>

      {/* Modal skeleton */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' && 'Create Admin'}
                {modalMode === 'edit' && 'Edit Admin'}
                {modalMode === 'view' && 'Admin Details'}
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">Modal content coming next.</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-6 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
              <div className="bg-white p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={submitManualPassword}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type={passwordVisible ? 'text' : 'password'}
                          name="password"
                          value={passwordForm.password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md"
                          required
                          placeholder="Enter new password"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setPasswordVisible(!passwordVisible)}>
                          <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                      Update Password
                    </button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm" onClick={() => setShowPasswordModal(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;