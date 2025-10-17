import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FolderIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import {
  fetchCategories,
  fetchCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateCategories,
  fetchCategoryStatistics,
  exportCategories
} from '../../store/slices/categorySlice';

const CategoryManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    categories,
    loading,
    error,
    pagination,
    selectedCategory,
    categoryStatistics
  } = useSelector((state) => state.categories);

  // Local state management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    image: '',
    status: 'active',
    sortOrder: 0,
    seoTitle: '',
    seoDescription: '',
    slug: ''
  });

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchCategories({ 
        page: pagination?.currentPage || 1, 
        limit: 50,
        search: searchTerm,
        status: 'all'
      }));
    };

    fetchData();
    dispatch(fetchCategoryStatistics());
  }, [dispatch, pagination?.currentPage, searchTerm]);
  const handleSearch = (e) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    
    // Dispatch search with debouncing could be added here
    dispatch(fetchCategories({ 
      page: 1, 
      limit: 50, 
      search: searchValue 
    }));
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    const allCategoryIds = getAllCategoryIds(categories || []);
    if (selectedCategories.length === allCategoryIds.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCategoryIds);
    }
  };

  const getAllCategoryIds = (categories) => {
    let ids = [];
    categories.forEach(category => {
      ids.push(category._id || category.id);
      if (category.children && category.children.length > 0) {
        ids = ids.concat(getAllCategoryIds(category.children));
      }
    });
    return ids;
  };

  const toggleExpanded = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const openModal = (type, category = null) => {
    setModalType(type);
    if (type === 'view' && category) {
      dispatch(fetchCategoryById(category._id || category.id));
    }
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parentId: category.parentId || '',
        image: category.image || '',
        status: category.status || 'active',
        sortOrder: category.sortOrder || 0,
        seoTitle: category.seoTitle || '',
        seoDescription: category.seoDescription || '',
        slug: category.slug || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parentId: '',
        image: '',
        status: 'active',
        sortOrder: 0,
        seoTitle: '',
        seoDescription: '',
        slug: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setFormData({
      name: '',
      description: '',
      parentId: '',
      image: '',
      status: 'active',
      sortOrder: 0,
      seoTitle: '',
      seoDescription: '',
      slug: ''
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await dispatch(createCategory(formData)).unwrap();
      } else if (modalType === 'edit' && selectedCategory) {
        await dispatch(updateCategory({ 
          id: selectedCategory._id || selectedCategory.id, 
          categoryData: formData 
        })).unwrap();
      }
      
      // Refresh categories after successful operation
      dispatch(fetchCategories({ page: 1, limit: 50 }));
      closeModal();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleBulkAction = async (action) => {
    try {
      const actionData = {};
      if (action === 'activate') {
        actionData.status = 'active';
      } else if (action === 'deactivate') {
        actionData.status = 'inactive';
      }
      
      await dispatch(bulkUpdateCategories({
        categoryIds: selectedCategories,
        action,
        data: actionData
      })).unwrap();
      
      // Refresh categories and clear selection
      dispatch(fetchCategories({ page: 1, limit: 50 }));
      setSelectedCategories([]);
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const handleCategoryAction = async (action, categoryId) => {
    try {
      if (action === 'delete') {
        await dispatch(deleteCategory(categoryId)).unwrap();
        // Refresh categories after deletion
        dispatch(fetchCategories({ page: 1, limit: 50 }));
      }
    } catch (error) {
      console.error('Category action error:', error);
    }
  };

  // Filter categories based on search (client-side filtering for immediate feedback)
  const filterCategories = (categories, searchTerm) => {
    if (!categories || !searchTerm) return categories || [];
    
    return categories.filter(category => {
      const matchesSearch = (category.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (category.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasMatchingChildren = category.children && category.children.length > 0 &&
                                 filterCategories(category.children, searchTerm).length > 0;
      
      return matchesSearch || hasMatchingChildren;
    }).map(category => ({
      ...category,
      children: category.children ? filterCategories(category.children, searchTerm) : []
    }));
  };

  const filteredCategories = filterCategories(categories, searchTerm);

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircleIcon }
    };

    // Handle undefined/null status with fallback
    const safeStatus = status || 'active';
    const config = statusConfig[safeStatus] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </span>
    );
  };

  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category.id} className={`${level > 0 ? 'ml-8' : ''}`}>
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.id)}
              onChange={() => handleSelectCategory(category.id)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            
            {category.children && category.children.length > 0 && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <FolderIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.description}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-500">
              {category.productCount} products
            </div>
            {getStatusBadge(category.status)}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openModal('view', category)}
                className="text-gray-400 hover:text-gray-600"
                title="View Details"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => openModal('edit', category)}
                className="text-blue-400 hover:text-blue-600"
                title="Edit Category"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleCategoryAction('delete', category.id)}
                className="text-red-400 hover:text-red-600"
                title="Delete Category"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {expandedCategories.has(category.id) && category.children && category.children.length > 0 && (
          <div className="bg-gray-50">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getParentCategories = (categories, excludeId = null) => {
    let parents = [];
    categories.forEach(category => {
      if (category.id !== excludeId) {
        parents.push({ id: category.id, name: category.name });
        if (category.children && category.children.length > 0) {
          parents = parents.concat(getParentCategories(category.children, excludeId));
        }
      }
    });
    return parents;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Organize and manage product categories and subcategories.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => openModal('add')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Categories</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {categoryStatistics?.totalCategories || getAllCategoryIds(categories || []).length}
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
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Categories</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {categoryStatistics?.activeCategories || 
                     getAllCategoryIds((categories || []).filter(c => c.status === 'active')).length}
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
                <TagIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Root Categories</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {categoryStatistics?.rootCategories || 
                     (categories || []).filter(c => !c.parentId).length}
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
                <PhotoIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {categoryStatistics?.totalProducts || 
                     (categories || []).reduce((total, cat) => total + (cat.productCount || 0) + 
                       ((cat.children || []).reduce((subTotal, child) => subTotal + (child.productCount || 0), 0)), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Bulk Actions */}
            {selectedCategories.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Categories ({getAllCategoryIds(filteredCategories).length})
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedCategories.length === getAllCategoryIds(filteredCategories).length && getAllCategoryIds(filteredCategories).length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Select All</label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new category.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => openModal('add')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Category
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {renderCategoryTree(filteredCategories)}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit/View Category */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {modalType === 'add' ? 'Add Category' : 
                   modalType === 'edit' ? 'Edit Category' : 'Category Details'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              {modalType === 'view' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedCategory?.status)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCategory?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Slug</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory?.slug}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Product Count</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory?.productCount}</p>
                    </div>
                  </div>
                  
                  {selectedCategory?.image && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Image</label>
                      <img
                        src={selectedCategory.image}
                        alt={selectedCategory.name}
                        className="mt-1 h-32 w-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SEO Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory?.seoTitle}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory?.sortOrder}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SEO Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCategory?.seoDescription}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Slug</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Parent Category</label>
                      <select
                        value={formData.parentId}
                        onChange={(e) => setFormData({...formData, parentId: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">None (Root Category)</option>
                        {getParentCategories(categories, selectedCategory?.id).map(parent => (
                          <option key={parent.id} value={parent.id}>{parent.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Image URL</label>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(e) => setFormData({...formData, image: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SEO Title</label>
                    <input
                      type="text"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData({...formData, seoTitle: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SEO Description</label>
                    <textarea
                      rows={2}
                      value={formData.seoDescription}
                      onChange={(e) => setFormData({...formData, seoDescription: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {modalType === 'add' ? 'Create Category' : 'Update Category'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;