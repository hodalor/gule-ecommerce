import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchComplaints,
  updateComplaintStatus,
  assignComplaint,
  addComplaintNote,
  resolveComplaint,
  escalateComplaint,
  exportComplaints
} from '../../store/slices/complaintsSlice';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const ComplaintsManagement = () => {
  const dispatch = useDispatch();
  const { 
    complaints, 
    loading, 
    error, 
    pagination 
  } = useSelector((state) => state.complaints);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [newNote, setNewNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const tabs = [
    { id: 'all', name: 'All Complaints', icon: ExclamationTriangleIcon, count: complaints?.length || 0 },
    { id: 'pending', name: 'Pending', icon: ClockIcon, count: complaints?.filter(c => c.status === 'pending')?.length || 0 },
    { id: 'in_progress', name: 'In Progress', icon: ChatBubbleLeftRightIcon, count: complaints?.filter(c => c.status === 'in_progress')?.length || 0 },
    { id: 'resolved', name: 'Resolved', icon: CheckCircleIcon, count: complaints?.filter(c => c.status === 'resolved')?.length || 0 },
    { id: 'escalated', name: 'Escalated', icon: ArrowUpIcon, count: complaints?.filter(c => c.status === 'escalated')?.length || 0 }
  ];

  const complaintStatuses = ['pending', 'in_progress', 'resolved', 'closed', 'escalated'];
  const complaintPriorities = ['low', 'medium', 'high', 'urgent'];
  const complaintCategories = [
    'product_quality',
    'shipping_delivery',
    'payment_billing',
    'customer_service',
    'seller_behavior',
    'platform_issue',
    'refund_return',
    'account_access',
    'other'
  ];

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchComplaints({ 
        page: pagination?.currentPage || 1, 
        limit: pagination?.itemsPerPage || 20,
        search: searchTerm,
        status: activeTab !== 'all' ? activeTab : statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      }));
    };

    fetchData();
  }, [dispatch, activeTab, searchTerm, statusFilter, priorityFilter, categoryFilter, dateRange, pagination?.currentPage]);

  const handleViewComplaint = (complaint) => {
    setModalMode('view');
    setSelectedComplaint(complaint);
    setNewNote('');
    setAssigneeId(complaint.assignedTo || '');
    setShowModal(true);
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    if (window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      dispatch(updateComplaintStatus({ id: complaintId, status: newStatus }));
    }
  };

  const handleAssignComplaint = async () => {
    if (!assigneeId) {
      alert('Please select an assignee');
      return;
    }
    dispatch(assignComplaint({ 
      id: selectedComplaint.id, 
      assigneeId 
    }));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note');
      return;
    }
    dispatch(addComplaintNote({ 
      id: selectedComplaint.id, 
      note: newNote,
      author: currentUser.name
    }));
    setNewNote('');
  };

  const handleResolveComplaint = async (complaintId) => {
    if (window.confirm('Are you sure you want to mark this complaint as resolved?')) {
      dispatch(resolveComplaint(complaintId));
    }
  };

  const handleEscalateComplaint = async (complaintId) => {
    if (window.confirm('Are you sure you want to escalate this complaint?')) {
      dispatch(escalateComplaint(complaintId));
    }
  };

  const handleExportComplaints = () => {
    dispatch(exportComplaints({ 
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      dateRange 
    }));
  };

  const filteredComplaints = complaints?.filter(complaint => {
    const matchesSearch = complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.complainant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || complaint.status === statusFilter;
    const matchesPriority = priorityFilter === '' || complaint.priority === priorityFilter;
    const matchesCategory = categoryFilter === '' || complaint.category === categoryFilter;
    const matchesTab = activeTab === 'all' || complaint.status === activeTab;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesTab;
  }) || [];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'product_quality': return ShoppingBagIcon;
      case 'seller_behavior': return BuildingStorefrontIcon;
      default: return ExclamationTriangleIcon;
    }
  };

  const canManageComplaints = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'customer_support';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints Management</h1>
          <p className="text-gray-600">Handle and resolve user complaints efficiently</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportComplaints}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Complaints
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {complaints?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {complaints?.filter(c => c.status === 'pending')?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Resolved Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {complaints?.filter(c => c.status === 'resolved' && 
                      new Date(c.resolvedAt).toDateString() === new Date().toDateString())?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUpIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Escalated
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {complaints?.filter(c => c.status === 'escalated')?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Complaints
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, ID, or complainant..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {complaintStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              {complaintPriorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {complaintCategories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex space-x-1">
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Complaint ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title & Complainant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading complaints...
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No complaints found
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((complaint) => {
                  const CategoryIcon = getCategoryIcon(complaint.category);
                  return (
                    <tr key={complaint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{complaint.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{complaint.title}</div>
                          <div className="text-sm text-gray-500">
                            by {complaint.complainant?.name || 'Unknown User'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CategoryIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {complaint.category?.replace('_', ' ').charAt(0).toUpperCase() + 
                             complaint.category?.replace('_', ' ').slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority?.charAt(0).toUpperCase() + complaint.priority?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status?.replace('_', ' ').charAt(0).toUpperCase() + 
                           complaint.status?.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(complaint.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewComplaint(complaint)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canManageComplaints && (
                            <>
                              {complaint.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(complaint.id, 'in_progress')}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Start Processing"
                                >
                                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                </button>
                              )}
                              {complaint.status === 'in_progress' && (
                                <button
                                  onClick={() => handleResolveComplaint(complaint.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Mark as Resolved"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                              )}
                              {complaint.status !== 'escalated' && complaint.priority !== 'urgent' && (
                                <button
                                  onClick={() => handleEscalateComplaint(complaint.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Escalate"
                                >
                                  <ArrowUpIcon className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Complaint #{selectedComplaint.id}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedComplaint.title}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority?.charAt(0).toUpperCase() + selectedComplaint.priority?.slice(1)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedComplaint.status)}`}>
                    {selectedComplaint.status?.replace('_', ' ').charAt(0).toUpperCase() + 
                     selectedComplaint.status?.replace('_', ' ').slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Complaint Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Complaint Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedComplaint.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Complainant</label>
                      <p className="text-sm text-gray-900">{selectedComplaint.complainant?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="text-sm text-gray-900">
                        {selectedComplaint.category?.replace('_', ' ').charAt(0).toUpperCase() + 
                         selectedComplaint.category?.replace('_', ' ').slice(1)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedComplaint.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                      <p className="text-sm text-gray-900">
                        {selectedComplaint.assignedTo || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {/* Assignment */}
                  {canManageComplaints && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <div className="flex space-x-2">
                        <select
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                        >
                          <option value="">Select Assignee</option>
                          <option value="admin1">Admin 1</option>
                          <option value="admin2">Admin 2</option>
                          <option value="reviewer1">Reviewer 1</option>
                        </select>
                        <button
                          onClick={handleAssignComplaint}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes and Actions */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notes & Updates</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      {selectedComplaint.notes?.length > 0 ? (
                        selectedComplaint.notes.map((note, index) => (
                          <div key={index} className="mb-3 last:mb-0">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-gray-600">{note.author}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No notes yet</p>
                      )}
                    </div>
                  </div>

                  {/* Add Note */}
                  {canManageComplaints && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Note
                      </label>
                      <div className="space-y-2">
                        <textarea
                          rows="3"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Add a note about this complaint..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <button
                          onClick={handleAddNote}
                          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          Add Note
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {canManageComplaints && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedComplaint.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedComplaint.id, 'in_progress')}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            Start Processing
                          </button>
                        )}
                        {selectedComplaint.status === 'in_progress' && (
                          <button
                            onClick={() => handleResolveComplaint(selectedComplaint.id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {selectedComplaint.status !== 'escalated' && (
                          <button
                            onClick={() => handleEscalateComplaint(selectedComplaint.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Escalate
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(selectedComplaint.id, 'closed')}
                          className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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

export default ComplaintsManagement;