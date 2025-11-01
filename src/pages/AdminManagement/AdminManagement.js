import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  generateWorkId
} from '../../store/slices/adminSlice';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const roleLabelMap = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  review_officer: 'Review Officer',
  customer_support: 'Customer Support',
  marketing_manager: 'Marketing Manager',
  finance: 'Accountant',
  moderator: 'Review Officer',
  support: 'Customer Support',
  marketing: 'Marketing Manager'
};

const normalizeAdmin = (a = {}) => {
  const id = a.id || a._id || a.adminId;
  const first = a.firstName || (a.fullName ? a.fullName.split(' ')[0] : '');
  const last = a.lastName || (a.fullName ? a.fullName.split(' ').slice(1).join(' ') : '');
  const fullName = (a.fullName || `${first} ${last}` || '').trim();
  const role = roleLabelMap[a.role] || a.role || 'Admin';
  const statusRaw = a.status || a.accountStatus || 'active';
  const status = statusRaw ? (statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)) : 'Active';
  const dateJoined = a.registrationDate || a.createdAt || a.hireDate || new Date().toISOString();
  const photo = a.photo || a.profileImage || null;
  return {
    id,
    fullName,
    email: a.email || '',
    employeeId: a.employeeId || a.employeeID || '',
    role,
    status,
    dateJoined,
    photo,
    raw: a
  };
};

const AdminManagement = () => {
  const dispatch = useDispatch();
  const { 
    admins, 
    loading, 
    error, 
    pagination, 
    selectedAdmin 
  } = useSelector((state) => state.admin);
  const { user } = useSelector((state) => state.auth);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'Admin',
    photo: '',
    dateExpiry: ''
  });

  // Added submit lifecycle state for UI feedback
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper to convert backend error payloads to a flat field error map
  const toFieldErrorMap = (payload) => {
    const map = {};
    if (!payload) return map;
    const src = payload.errors || payload.validationErrors || payload.details;
    if (src && typeof src === 'object') {
      Object.entries(src).forEach(([key, val]) => {
        if (!val) return;
        map[key] = typeof val === 'string' ? val : (val.message || (Array.isArray(val) ? val[0] : 'Invalid'));
      });
    }
    if (!Object.keys(map).length && typeof payload.message === 'string') {
      map._ = payload.message;
    }
    return map;
  };
  const roles = ['Super Admin', 'Admin', 'Accountant', 'Review Officer', 'Customer Support', 'Marketing Manager'];

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchAdmins({ 
        page: pagination?.currentPage || 1, 
        limit: 10,
        search: searchTerm,
        role: filterRole
      }));
    };

    fetchData();
  }, [dispatch, pagination?.currentPage, searchTerm, filterRole]);

  const handleCreateAdmin = () => {
    setModalMode('create');
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'Admin',
      photo: '',
      dateExpiry: ''
    });
    setSubmitError(null);
    setFieldErrors({});
    setSubmitSuccess(null);
    setSubmitting(false);
    setShowModal(true);
  };

  const handleEditAdmin = (admin) => {
    const n = normalizeAdmin(admin);
    setModalMode('edit');
    setEditingAdminId(n.id);
    setFormData({
      fullName: n.fullName,
      email: n.email,
      phone: n.raw?.phone || '',
      password: '',
      role: n.role,
      photo: n.photo || '',
      dateExpiry: ''
    });
    setSubmitError(null);
    setFieldErrors({});
    setSubmitSuccess(null);
    setSubmitting(false);
    setShowModal(true);
  };

  const handleViewAdmin = (admin) => {
    const n = normalizeAdmin(admin);
    setModalMode('view');
    setFormData({
      fullName: n.fullName,
      email: n.email,
      phone: n.raw?.phone || '',
      role: n.role,
      employeeId: n.employeeId
    });
    setSubmitError(null);
    setFieldErrors({});
    setSubmitSuccess(null);
    setSubmitting(false);
    setShowModal(true);
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      dispatch(deleteAdmin({ id: adminId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    setSubmitSuccess(null);
    try {
      if (modalMode === 'create') {
        const created = await dispatch(createAdmin(formData)).unwrap();
        if (created) {
          setSubmitSuccess('Admin created successfully.');
          // keep modal open; reset form so user can add another
          setFormData({
            fullName: '',
            email: '',
            phone: '',
            password: '',
            role: 'Admin',
            photo: '',
            dateExpiry: ''
          });
        }
      } else if (modalMode === 'edit') {
        const [firstName, ...rest] = (formData.fullName || '').trim().split(' ');
        const updatePayload = {
          firstName,
          lastName: rest.join(' '),
          phone: formData.phone
        };
        await dispatch(updateAdmin({ id: editingAdminId, adminData: updatePayload })).unwrap();
        setSubmitSuccess('Admin updated successfully.');
      }
    } catch (err) {
      const fe = toFieldErrorMap(err);
      setFieldErrors(fe);
      setSubmitError(err?.message || 'Submission failed. Please review the highlighted fields.');
      // do not close modal on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadWorkId = async (adminId) => {
    dispatch(generateWorkId(adminId));
  };

  const normalizedAdmins = admins.map(normalizeAdmin);
  const filteredAdmins = normalizedAdmins.filter((admin) => {
    const name = (admin.fullName || '').toLowerCase();
    const email = (admin.email || '').toLowerCase();
    const empId = (admin.employeeId || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      empId.includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === '' || admin.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const canManageAdmins = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600">Manage admin users and their permissions</p>
        </div>
        {canManageAdmins && (
          <button
            onClick={handleCreateAdmin}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Admin
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Admin Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No admins found
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {admin.photo ? (
                            <img className="h-10 w-10 rounded-full" src={admin.photo} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {admin.fullName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {admin.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {admin.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.role === 'Super Admin' ? 'bg-purple-100 text-purple-800' :
                        admin.role === 'Admin' ? 'bg-blue-100 text-blue-800' :
                        admin.role === 'Accountant' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(admin.dateJoined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewAdmin(admin.raw)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadWorkId(admin.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download Work ID"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        {canManageAdmins && (
                          <>
                            <button
                              onClick={() => handleEditAdmin(admin.raw)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit Admin"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Admin"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Add New Admin' : 
                 modalMode === 'edit' ? 'Edit Admin' : 'Admin Details'}
              </h3>
              
              {modalMode === 'view' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{formData.fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{formData.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{formData.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{formData.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{formData.employeeId}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
                      {submitSuccess}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Belinda Mwila"
                      className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.fullName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+260971234567"
                      className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    <p className="mt-1 text-xs text-gray-500">Use international format (E.164), e.g., +260971234567.</p>
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                    )}
                  </div>
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 8 chars, mix letters & numbers"
                        className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      {fieldErrors.password && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      required
                      className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.role ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {fieldErrors.role && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Expiry</label>
                    <input
                      type="date"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={formData.dateExpiry}
                      onChange={(e) => setFormData({...formData, dateExpiry: e.target.value})}
                    />
                  </div>
                </form>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
                  >
                    {modalMode === 'create' ? (submitting ? 'Creating...' : 'Create Admin') : (submitting ? 'Updating...' : 'Update Admin')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;