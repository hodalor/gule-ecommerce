import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAdmin, deleteAdmin, fetchAdmins, updateAdmin } from '../../store/slices/adminSlice';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, PencilIcon, EyeIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const roleOptions = [
  { label: 'Super Admin', value: 'super_admin', department: 'administration' },
  { label: 'Admin', value: 'admin', department: 'administration' },
  { label: 'Accountant', value: 'accountant', department: 'finance' },
  { label: 'Review Officer', value: 'review_officer', department: 'operations' },
  { label: 'Customer Support', value: 'customer_support', department: 'customer_service' },
  { label: 'Marketing Manager', value: 'marketing_manager', department: 'marketing' }
];

const defaultForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'admin',
  department: 'administration',
  password: '',
  confirmPassword: ''
};

const labelByRole = Object.fromEntries(roleOptions.map((option) => [option.value, option.label]));

const buildFormFromAdmin = (admin) => ({
  fullName: `${admin?.firstName || admin?.name || ''} ${admin?.lastName || ''}`.trim(),
  email: admin?.email || '',
  phone: admin?.phone || admin?.contact?.phone || '',
  role: admin?.role || 'admin',
  department: admin?.department || admin?.employment?.department || 'administration',
  password: '',
  confirmPassword: ''
});

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
  const [formData, setFormData] = useState(defaultForm);
  
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
    setFormData(defaultForm);
    setShowModal(true);
  };

  const handleView = (admin) => {
    setSelectedAdmin(admin);
    setModalMode('view');
    setFormData(buildFormFromAdmin(admin));
    setShowModal(true);
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setModalMode('edit');
    setFormData(buildFormFromAdmin(admin));
    setShowModal(true);
  };

  const handleDelete = async (admin) => {
    const adminId = admin?.id || admin?._id;
    if (!adminId) {
      toast.error('Admin ID is missing.');
      return;
    }

    if (!window.confirm(`Delete ${admin.email || admin.firstName || 'this admin'}?`)) {
      return;
    }

    try {
      await dispatch(deleteAdmin({ id: adminId, reason: 'Removed from admin management' })).unwrap();
      toast.success('Admin deleted successfully');
    } catch (error) {
      toast.error(error?.message || error || 'Failed to delete admin');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAdmin(null);
    setFormData(defaultForm);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'role') {
        const roleMeta = roleOptions.find((option) => option.value === value);
        next.department = roleMeta?.department || prev.department;
      }
      return next;
    });
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (modalMode === 'create') {
      if (!formData.password || formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    try {
      if (modalMode === 'create') {
        await dispatch(createAdmin(formData)).unwrap();
        toast.success('Admin account created successfully');
      } else if (modalMode === 'edit' && selectedAdmin) {
        const [firstNameRaw, ...rest] = formData.fullName.trim().split(' ');
        const updatePayload = {
          firstName: firstNameRaw || selectedAdmin.firstName || 'Admin',
          lastName: rest.join(' ') || selectedAdmin.lastName || 'User',
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department: formData.department
        };

        await dispatch(updateAdmin({
          id: selectedAdmin.id || selectedAdmin._id,
          adminData: updatePayload
        })).unwrap();
        toast.success('Admin updated successfully');
      }

      closeModal();
    } catch (error) {
      const message = error?.message || error?.error || 'Failed to save admin';
      toast.error(message);
    }
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
        userId: selectedAdmin.id || selectedAdmin._id,
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
                <option key={r.value} value={r.value}>{r.label}</option>
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
            {modalMode === 'view' ? (
              <>
                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Full Name</div>
                    <div className="font-medium text-gray-900">{formData.fullName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{formData.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Phone</div>
                    <div className="font-medium text-gray-900">{formData.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Role</div>
                    <div className="font-medium text-gray-900">{labelByRole[formData.role] || formData.role || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Department</div>
                    <div className="font-medium text-gray-900">{formData.department || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Employee ID</div>
                    <div className="font-medium text-gray-900">{selectedAdmin?.employeeId || '—'}</div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end space-x-3">
                  <button onClick={closeModal} className="px-4 py-2 border rounded-md">Close</button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitAdmin}>
                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="+260..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleFormChange('role', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleFormChange('department', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  {modalMode === 'create' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleFormChange('password', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="At least 8 characters"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Repeat password"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-6 py-4 border-t flex justify-end space-x-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-md">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700">
                    {modalMode === 'create' ? 'Create Admin' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
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
