import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  fetchProducts,
  fetchCategories
} from '../../store/slices/productSlice';

const SellerProducts = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { products, loading, error, categories: categoriesFromStore } = useSelector((state) => state.products);
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedProducts, setSelectedProducts] = useState([]);
  // State for image handling
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const hasError = (field) => {
    if (!formErrors) return false;
    if (formErrors[field]) return true;
    return Object.keys(formErrors).some(k => k === field || k.startsWith(field + '.') || k.startsWith(field + '['));
  };
  const getFieldErrors = (field) => {
    if (!formErrors) return [];
    if (formErrors[field]) return Array.isArray(formErrors[field]) ? formErrors[field] : [formErrors[field]];
    const matches = Object.keys(formErrors).filter(k => k === field || k.startsWith(field + '.') || k.startsWith(field + '['));
    return matches.flatMap(k => Array.isArray(formErrors[k]) ? formErrors[k] : [formErrors[k]]);
  };
  const renderError = (field) => {
    const errs = getFieldErrors(field);
    if (!errs.length) return null;
    return (
      <p className="mt-1 text-sm text-red-600">{errs.join(' ')}</p>
    );
  };

  // Handle image file selection
  const handleImageSelect = (files) => {
    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were rejected. Please ensure all files are images under 10MB.');
    }

    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(prev => [...prev, {
          file,
          url: e.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image from selection
  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleImageSelect(files);
   };

   const [showProductModal, setShowProductModal] = useState(false);
  const addVariant = () => {
    const newVariant = {
      id: Date.now(),
      name: '',
      options: [{ value: '', price: '', stock: '', sku: '' }]
    };
    setProductForm(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
  };

  const removeVariant = (variantId) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId)
    }));
  };

  const updateVariant = (variantId, field, value) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === variantId ? { ...v, [field]: value } : v
      )
    }));
  };

  const addVariantOption = (variantId) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === variantId 
          ? { ...v, options: [...v.options, { value: '', price: '', stock: '', sku: '' }] }
          : v
      )
    }));
  };

  const removeVariantOption = (variantId, optionIndex) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === variantId 
          ? { ...v, options: v.options.filter((_, i) => i !== optionIndex) }
          : v
      )
    }));
  };

  const updateVariantOption = (variantId, optionIndex, field, value) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === variantId 
          ? { 
              ...v, 
              options: v.options.map((opt, i) => 
                i === optionIndex ? { ...opt, [field]: value } : opt
              )
            }
          : v
      )
    }));
  };

  // Handle attributes management
  const addAttribute = () => {
    const newAttribute = {
      id: Date.now(),
      name: '',
      values: [''],
      variation: false,
      visible: true
    };
    setProductForm(prev => ({
      ...prev,
      attributes: [...prev.attributes, newAttribute]
    }));
  };

  const removeAttribute = (attributeId) => {
    setProductForm(prev => ({
      ...prev,
      attributes: prev.attributes.filter(a => a.id !== attributeId)
    }));
  };

  const updateAttribute = (attributeId, field, value) => {
    setProductForm(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId ? { ...a, [field]: value } : a
      )
    }));
  };

  const addAttributeValue = (attributeId) => {
    setProductForm(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId 
          ? { ...a, values: [...a.values, ''] }
          : a
      )
    }));
  };

  const removeAttributeValue = (attributeId, valueIndex) => {
    setProductForm(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId 
          ? { ...a, values: a.values.filter((_, i) => i !== valueIndex) }
          : a
      )
    }));
  };

  const updateAttributeValue = (attributeId, valueIndex, value) => {
    setProductForm(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId 
          ? { 
              ...a, 
              values: a.values.map((val, i) => 
                i === valueIndex ? value : val
              )
            }
          : a
      )
    }));
  };
  const [editingProduct, setEditingProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    comparePrice: '',
    category: '',
    subcategory: '',
    brand: '',
    stock: '',
    lowStockThreshold: '',
    sku: '',
    barcode: '',
    status: 'active',
    productType: 'simple', // simple, variable, grouped, external
    isDigital: false,
    isFeatured: false,
    weight: { value: '', unit: 'kg' },
    dimensions: { length: '', width: '', height: '', unit: 'cm' },
    shippingClass: '',
    taxStatus: 'taxable',
    taxClass: 'standard',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    tags: [],
    images: [],
    variants: [],
    attributes: [],
    specifications: []
  });

  const categories = (categoriesFromStore || []).map(c => c.displayName || c.name);
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800' },
    { value: 'discontinued', label: 'Discontinued', color: 'bg-yellow-100 text-yellow-800' }
  ];

  // Fetch products when component mounts
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchProducts({ sellerId: user.id }));
    }
    dispatch(fetchCategories());
  }, [dispatch, user?.id]);

  // Filter and sort products
  useEffect(() => {
    const productsList = products || [];
    let filtered = [...productsList];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => {
        const categoryName = typeof product.category === 'object'
          ? (product.category?.name || '')
          : product.category;
        return categoryName === categoryFilter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          // Update products status to active via API
          for (const productId of selectedProducts) {
            await dispatch(updateProduct({ 
              id: productId, 
              updates: { status: 'active' } 
            })).unwrap();
          }
          toast.success(`${selectedProducts.length} products activated`);
          break;
        case 'deactivate':
          // Update products status to draft via API
          for (const productId of selectedProducts) {
            await dispatch(updateProduct({ 
              id: productId, 
              updates: { status: 'draft' } 
            })).unwrap();
          }
          toast.success(`${selectedProducts.length} products deactivated`);
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
            // Delete products via API
            for (const productId of selectedProducts) {
              await dispatch(deleteProduct(productId)).unwrap();
            }
            toast.success(`${selectedProducts.length} products deleted`);
          }
          break;
        default:
          toast.error('Unknown action');
          break;
      }
      setSelectedProducts([]);
      // Refresh products list
      if (user?.id) {
        dispatch(fetchProducts({ sellerId: user.id }));
      }
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreview([]);
    setFormErrors({});
    setProductForm({
      name: '',
      description: '',
      shortDescription: '',
      price: '',
      comparePrice: '',
      category: '',
      subcategory: '',
      brand: '',
      stock: '',
      lowStockThreshold: '',
      sku: '',
      barcode: '',
      status: 'active',
      productType: 'simple',
      isDigital: false,
      isFeatured: false,
      weight: { value: '', unit: 'kg' },
      dimensions: { length: '', width: '', height: '', unit: 'cm' },
      shippingClass: '',
      taxStatus: 'taxable',
      taxClass: 'standard',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      tags: [],
      images: [],
      variants: [],
      attributes: [],
      specifications: []
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setImageFiles([]);
    setImagePreview([]);
    setFormErrors({});
    
    // If product has existing images, create preview from URLs
    if (product.images && product.images.length > 0) {
      const existingPreviews = product.images.map((img, index) => ({
        url: typeof img === 'string' ? img : img.url,
        name: `existing-image-${index}`,
        isExisting: true
      }));
      setImagePreview(existingPreviews);
    }
    
    setProductForm({
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription || '',
      price: product.price.toString(),
      comparePrice: product.comparePrice?.toString() || '',
      category: product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      stock: product.stock.toString(),
      lowStockThreshold: (product.lowStockThreshold?.toString() || product.minStock?.toString() || ''),
      sku: product.sku,
      barcode: product.barcode || '',
      status: product.status,
      productType: product.productType || 'simple',
      isDigital: product.isDigital || false,
      isFeatured: product.isFeatured || false,
      weight: product.weight || { value: '', unit: 'kg' },
      dimensions: product.dimensions || { length: '', width: '', height: '', unit: 'cm' },
      shippingClass: product.shippingClass || '',
      taxStatus: product.taxStatus || 'taxable',
      taxClass: product.taxClass || 'standard',
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      seoKeywords: product.seoKeywords || '',
      tags: product.tags || [],
      images: product.images || [],
      variants: product.variants || [],
      attributes: product.attributes || [],
      specifications: product.specifications || []
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await dispatch(deleteProduct(productId)).unwrap();
        toast.success('Product deleted successfully');
        // Refresh products list
        if (user?.id) {
          dispatch(fetchProducts({ sellerId: user.id }));
        }
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setUploadingImages(true);

    try {
      const formData = new FormData();
      
      // Add all product fields to formData
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        comparePrice: productForm.comparePrice ? parseFloat(productForm.comparePrice) : null,
        stock: parseInt(productForm.stock),
        lowStockThreshold: parseInt(productForm.lowStockThreshold),
        sellerId: user?.id
      };

      Object.keys(productData).forEach(key => {
        if (key === 'dimensions' || key === 'variants' || key === 'attributes' || key === 'specifications' || key === 'tags' || key === 'weight') {
          formData.append(key, JSON.stringify(productData[key]));
        } else {
          formData.append(key, productData[key]);
        }
      });

      // Add new image files
      imageFiles.forEach((file, index) => {
        formData.append('images', file);
      });

      // If editing, include existing images that should be kept
      if (editingProduct) {
        const existingImages = imagePreview
          .filter(img => img.isExisting)
          .map(img => img.url);
        if (existingImages.length > 0) {
          formData.append('existingImages', JSON.stringify(existingImages));
        }
      }

      if (editingProduct) {
        // Update existing product
        await dispatch(updateProduct({ 
          id: editingProduct._id || editingProduct.id, 
          updates: productData,
          formData: formData
        })).unwrap();
        toast.success('Product updated successfully');
      } else {
        // Add new product
        await dispatch(createProduct({ 
          productData,
          formData: formData
        })).unwrap();
        toast.success('Product created successfully');
      }

      setShowProductModal(false);
      setImageFiles([]);
      setImagePreview([]);
      // Refresh products list
      if (user?.id) {
        dispatch(fetchProducts({ sellerId: user.id }));
      }
    } catch (error) {
      const errData = error?.payload || error;
      const errorsArray = Array.isArray(errData?.errors) ? errData.errors : [];

      if (errorsArray.length > 0) {
        const fieldErrorMap = {};
        errorsArray.forEach(err => {
          const field = err.field || err.param || err.path || '';
          const msg = err.message || err.msg || errData?.message || 'Validation error';
          const key = field || 'form';
          if (!fieldErrorMap[key]) fieldErrorMap[key] = [];
          fieldErrorMap[key].push(msg);
        });
        setFormErrors(fieldErrorMap);

        const firstMsg = errorsArray[0]?.message || errorsArray[0]?.msg || 'Please fix the highlighted fields';
        toast.error(firstMsg);
      } else {
        const genericMsg = (typeof errData === 'string' ? errData : errData?.message) || (editingProduct ? 'Failed to update product' : 'Failed to create product');
        setFormErrors({ form: [genericMsg] });
        toast.error(genericMsg);
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600' };
    if (stock <= minStock) return { label: 'Low Stock', color: 'text-yellow-600' };
    return { label: 'In Stock', color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <button
          onClick={handleAddProduct}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Product
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">Error loading products: {error}</span>
          </div>
          <button
            onClick={() => user?.id && dispatch(fetchProducts({ sellerId: user.id }))}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters and Search */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="createdAt">Sort by Date</option>
              <option value="views">Sort by Views</option>
              <option value="orders">Sort by Orders</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-gray-600">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    Price
                    {sortBy === 'price' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center gap-1">
                    Stock
                    {sortBy === 'stock' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock, (product.lowStockThreshold ?? product.minStock));
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0] || '/placeholder-image.jpg'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          <p className="text-sm text-gray-600">{typeof product.category === 'object' ? (product.category?.name || '') : product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">${product.price}</p>
                        {product.comparePrice && (
                          <p className="text-sm text-gray-500 line-through">${product.comparePrice}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`font-medium ${stockStatus.color}`}>
                          {product.stock} units
                        </p>
                        <p className="text-sm text-gray-600">Min: {product.lowStockThreshold ?? product.minStock}</p>
                        <p className={`text-xs ${stockStatus.color}`}>{stockStatus.label}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                        {statusOptions.find(s => s.value === product.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{product.views} views</p>
                        <p className="text-gray-600">{product.orders} orders</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit Product"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete Product"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No products found'
              : 'No products yet'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first product to your store'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
            <button
              onClick={handleAddProduct}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Product
            </button>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-6">
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type *
                </label>
                <select
                  value={productForm.productType}
                  onChange={(e) => setProductForm(prev => ({ ...prev, productType: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('productType') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                >
                  <option value="simple">Simple Product</option>
                  <option value="variable">Variable Product</option>
                  <option value="grouped">Grouped Product</option>
                  <option value="external">External/Affiliate Product</option>
                </select>
                {renderError('productType')}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('name') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  placeholder="Enter product name"
                />
                {renderError('name')}
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description
                </label>
                <textarea
                  value={productForm.shortDescription}
                  onChange={(e) => setProductForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief product summary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('description') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  placeholder="Enter detailed product description"
                />
                {renderError('description')}
              </div>

              {/* Product Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Images
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div 
                      className="text-gray-600"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <label htmlFor="product-images" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">Upload images</span>
                        <span> or drag and drop</span>
                      </label>
                      <input
                        id="product-images"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e.target.files)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                  </div>
                </div>
                
                {/* Image Preview */}
                {imagePreview.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          {preview.isExisting && (
                            <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                              Existing
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price and Compare Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Regular Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('price') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="0.00"
                  />
                  {renderError('price')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.comparePrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, comparePrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Category, Subcategory, Brand */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('category') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {renderError('category')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter subcategory"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter brand name"
                  />
                </div>
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('sku') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Enter SKU"
                  />
                  {renderError('sku')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter barcode"
                  />
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                    required
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${hasError('stock') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="0"
                  />
                  {renderError('stock')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={productForm.lowStockThreshold}
        onChange={(e) => setProductForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
        min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Weight and Dimensions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Shipping</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.weight.value}
                        onChange={(e) => setProductForm(prev => ({ 
                          ...prev, 
                          weight: { ...prev.weight, value: e.target.value }
                        }))}
                        className={`flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 ${hasError('weight') || hasError('weight.value') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="0.00"
                      />
                      <select
                        value={productForm.weight.unit}
                        onChange={(e) => setProductForm(prev => ({ 
                          ...prev, 
                          weight: { ...prev.weight, unit: e.target.value }
                        }))}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="lb">lb</option>
                        <option value="oz">oz</option>
                      </select>
                    </div>
                    {renderError('weight')}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions (L × W × H)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.dimensions.length}
                      onChange={(e) => setProductForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, length: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Length"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.dimensions.width}
                      onChange={(e) => setProductForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, width: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.dimensions.height}
                      onChange={(e) => setProductForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, height: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Height"
                    />
                    <select
                      value={productForm.dimensions.unit}
                      onChange={(e) => setProductForm(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, unit: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                  {renderError('dimensions')}
                </div>
              </div>

              {/* Product Attributes */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Attributes</h3>
                <div className="space-y-2">
                  {productForm.attributes.map((attr, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => {
                          const newAttrs = [...productForm.attributes];
                          newAttrs[index].name = e.target.value;
                          setProductForm(prev => ({ ...prev, attributes: newAttrs }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Attribute name (e.g., Color)"
                      />
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => {
                          const newAttrs = [...productForm.attributes];
                          newAttrs[index].value = e.target.value;
                          setProductForm(prev => ({ ...prev, attributes: newAttrs }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Attribute value (e.g., Red, Blue)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newAttrs = productForm.attributes.filter((_, i) => i !== index);
                          setProductForm(prev => ({ ...prev, attributes: newAttrs }));
                        }}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm(prev => ({
                        ...prev,
                        attributes: [...prev.attributes, { name: '', value: '' }]
                      }));
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Attribute
                  </button>
                </div>
              </div>

              {/* Product Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDigital"
                    checked={productForm.isDigital}
                    onChange={(e) => setProductForm(prev => ({ ...prev, isDigital: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDigital" className="ml-2 text-sm text-gray-700">
                    Digital Product
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={productForm.isFeatured}
                    onChange={(e) => setProductForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                    Featured Product
                  </label>
                </div>
              </div>

              {/* SEO Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">SEO</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={productForm.seoTitle}
                    onChange={(e) => setProductForm(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SEO optimized title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Description
                  </label>
                  <textarea
                    value={productForm.seoDescription}
                    onChange={(e) => setProductForm(prev => ({ ...prev, seoDescription: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Meta description for search engines"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    value={productForm.seoKeywords}
                    onChange={(e) => setProductForm(prev => ({ ...prev, seoKeywords: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Comma-separated keywords"
                  />
                </div>
              </div>

              {/* Variable Product Section */}
              {productForm.productType === 'variable' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add Variant
                    </button>
                  </div>
                  {renderError('variants')}
                  
                  {productForm.variants.map((variant, variantIndex) => (
                    <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                          placeholder="Variant name (e.g., Size, Color)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.id)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Options</span>
                          <button
                            type="button"
                            onClick={() => addVariantOption(variant.id)}
                            className="text-blue-600 text-sm hover:text-blue-800"
                          >
                            Add Option
                          </button>
                        </div>
                        
                        {variant.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="grid grid-cols-5 gap-2 items-center">
                            <input
                              type="text"
                              value={option.value}
                              onChange={(e) => updateVariantOption(variant.id, optionIndex, 'value', e.target.value)}
                              placeholder="Value"
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={option.price}
                              onChange={(e) => updateVariantOption(variant.id, optionIndex, 'price', e.target.value)}
                              placeholder="Price"
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              value={option.stock}
                              onChange={(e) => updateVariantOption(variant.id, optionIndex, 'stock', e.target.value)}
                              placeholder="Stock"
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={option.sku}
                              onChange={(e) => updateVariantOption(variant.id, optionIndex, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantOption(variant.id, optionIndex)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Attributes Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Product Attributes</h3>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Add Attribute
                  </button>
                </div>
                {renderError('attributes')}
                
                {productForm.attributes.map((attribute, attributeIndex) => (
                  <div key={attribute.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <input
                        type="text"
                        value={attribute.name}
                        onChange={(e) => updateAttribute(attribute.id, 'name', e.target.value)}
                        placeholder="Attribute name (e.g., Material, Brand)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={attribute.variation}
                            onChange={(e) => updateAttribute(attribute.id, 'variation', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Used for variations</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={attribute.visible}
                            onChange={(e) => updateAttribute(attribute.id, 'visible', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Visible on product page</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeAttribute(attribute.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Values</span>
                        <button
                          type="button"
                          onClick={() => addAttributeValue(attribute.id)}
                          className="text-blue-600 text-sm hover:text-blue-800"
                        >
                          Add Value
                        </button>
                      </div>
                      
                      {attribute.values.map((value, valueIndex) => (
                        <div key={valueIndex} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateAttributeValue(attribute.id, valueIndex, e.target.value)}
                            placeholder="Attribute value"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttributeValue(attribute.id, valueIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={productForm.status}
                  onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImages ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProducts;