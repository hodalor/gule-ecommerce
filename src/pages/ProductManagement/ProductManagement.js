import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { 
  fetchProducts, 
  fetchCategories, 
  createProduct,
  updateProduct,
  updateProductStatus, 
  deleteProduct, 
  bulkUpdateProducts,
  exportProducts,
  clearError 
} from '../../store/slices/productSlice';
import api from '../../utils/api';

const ATTRIBUTE_PRESET_OPTIONS = [
  'Color',
  'Size',
  'Material',
  'Storage',
  'Memory',
  'Capacity',
  'Model',
  'Style',
  'Network',
  'Condition'
];

const CUSTOM_ATTRIBUTE_VALUE = '__custom__';

const createRowId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createAttributeRow = () => ({
  id: createRowId(),
  preset: '',
  customName: '',
  values: [''],
  variation: false,
  visible: true
});

const createVariantRow = () => {
  const rowId = createRowId();

  return {
    id: rowId,
    optionId: rowId,
    name: '',
    value: '',
    price: '',
    stock: '',
    sku: '',
    image: null,
    imageFile: null,
    imagePreview: '',
    imageUploadField: `variant_image_${rowId}`
  };
};

const formatPrice = (value, currency = 'GHS') => `${Number(value || 0).toFixed(2)} ${currency}`;

const getProductDisplayPrice = (product) => {
  const min = Number(product?.priceRange?.min);
  const max = Number(product?.priceRange?.max);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  return formatPrice(product?.price || 0);
};

const buildProductFormData = ({ formData, imageFiles }) => {
  const normalizedAttributes = (Array.isArray(formData.attributes) ? formData.attributes : [])
    .map((attribute) => ({
      name: attribute?.preset === CUSTOM_ATTRIBUTE_VALUE
        ? String(attribute?.customName || '').trim()
        : String(attribute?.preset || '').trim(),
      values: (Array.isArray(attribute?.values) ? attribute.values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
      variation: !!attribute?.variation,
      visible: attribute?.visible !== false
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);

  const normalizedVariants = (Array.isArray(formData.variants) ? formData.variants : [])
    .map((variant) => ({
      optionId: variant.optionId || variant.id,
      name: String(variant.name || '').trim(),
      value: String(variant.value || '').trim(),
      price: variant.price === '' ? 0 : Number(variant.price),
      stock: variant.stock === '' ? 0 : Number(variant.stock),
      sku: String(variant.sku || '').trim(),
      image: variant.image || null,
      imageUploadField: variant.imageUploadField
    }))
    .filter((variant) => variant.name && variant.value);

  const variantPrices = normalizedVariants
    .map((variant) => Number(variant.price))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const derivedPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  const derivedStock = normalizedVariants.reduce((sum, variant) => {
    const stock = Number(variant.stock);
    return sum + (Number.isFinite(stock) && stock > 0 ? stock : 0);
  }, 0);
  const resolvedPrice = formData.productType === 'variable'
    ? derivedPrice
    : (formData.price === '' ? 0 : Number(formData.price));
  const resolvedStock = formData.productType === 'variable'
    ? derivedStock
    : (formData.stock === '' ? 0 : Number(formData.stock));

  const payload = new FormData();
  payload.append('name', formData.name || '');
  payload.append('description', formData.description || '');
  payload.append('shortDescription', formData.shortDescription || '');
  payload.append('price', String(resolvedPrice));
  payload.append('comparePrice', formData.comparePrice === '' ? '0' : String(formData.comparePrice));
  payload.append('category', formData.category || '');
  payload.append('subcategory', formData.subcategory || '');
  payload.append('brand', formData.brand || '');
  payload.append('stock', String(resolvedStock));
  payload.append('minStock', formData.minStock === '' ? '0' : String(formData.minStock));
  payload.append('sku', formData.sku || '');
  payload.append('barcode', formData.barcode || '');
  payload.append('status', formData.status || 'active');
  payload.append('productType', formData.productType || 'simple');
  payload.append('isDigital', String(!!formData.isDigital));
  payload.append('isFeatured', String(!!formData.isFeatured));
  payload.append('shippingClass', formData.shippingClass || '');
  payload.append('taxStatus', formData.taxStatus || 'taxable');
  payload.append('taxClass', formData.taxClass || 'standard');
  payload.append('seoTitle', formData.seoTitle || '');
  payload.append('seoDescription', formData.seoDescription || '');
  payload.append('seoKeywords', Array.isArray(formData.seoKeywords) ? formData.seoKeywords.join(', ') : (formData.seoKeywords || ''));
  payload.append('dimensions', JSON.stringify(formData.dimensions || {}));
  payload.append('weight', JSON.stringify(formData.weight || {}));
  payload.append('tags', JSON.stringify(Array.isArray(formData.tags) ? formData.tags : []));
  payload.append('attributes', JSON.stringify(normalizedAttributes));
  payload.append('variants', JSON.stringify(normalizedVariants));
  payload.append('specifications', JSON.stringify(Array.isArray(formData.specifications) ? formData.specifications : []));
  payload.append('sellerId', formData.sellerId || '');

  (Array.isArray(imageFiles) ? imageFiles : []).forEach((file) => {
    payload.append('images', file);
  });

  normalizedVariants.forEach((variant) => {
    const sourceVariant = (Array.isArray(formData.variants) ? formData.variants : []).find(
      (item) => (item.optionId || item.id) === variant.optionId
    );
    if (sourceVariant?.imageFile) {
      payload.append(variant.imageUploadField, sourceVariant.imageFile);
    }
  });

  return payload;
};

const ProductManagement = () => {
  const dispatch = useDispatch();
  const { 
    products, 
    categories, 
    loading, 
    error, 
    pagination,
    filters 
  } = useSelector(state => state.products);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    comparePrice: '',
    category: '',
    subcategory: '',
    brand: '',
    stock: '',
    minStock: '',
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
    specifications: [],
    sellerId: ''
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Auto-save functionality
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = React.useRef(null);

  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchProducts({
        page: pagination?.currentPage || currentPage,
        limit: pageSize,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }));
    };

    fetchData();
    dispatch(fetchCategories({ page: 1, limit: 100 }));
    fetchSellers();
  }, [dispatch, currentPage, pageSize, searchTerm, categoryFilter, statusFilter, pagination?.currentPage]);

  const fetchSellers = async () => {
    try {
      const response = await api.get('/admin/sellers?page=1&limit=100');
      const sellerList = response.data?.data?.sellers || [];
      setSellers(Array.isArray(sellerList) ? sellerList : []);
    } catch (err) {
      console.error('Failed to fetch sellers');
      setSellers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const productPayload = buildProductFormData({ formData, imageFiles });

      if (modalMode === 'create') {
        await dispatch(createProduct(productPayload)).unwrap();
      } else {
        await dispatch(updateProduct({
          productId: selectedProduct?._id || selectedProduct?.id,
          productData: productPayload
        })).unwrap();
      }
      
      setShowModal(false);
      resetForm();
      // Refresh products list
      dispatch(fetchProducts({ 
        page: pagination?.currentPage || 1, 
        limit: pagination?.itemsPerPage || 20,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
        priceRange: priceRange.min && priceRange.max ? priceRange : undefined,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      }));
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await dispatch(deleteProduct({ productId, reason: 'Admin deletion' }));
        // Refresh products list
        dispatch(fetchProducts({ 
          page: pagination?.currentPage || 1, 
          limit: pagination?.itemsPerPage || 20,
          search: searchTerm,
          category: categoryFilter,
          status: statusFilter,
          priceRange: priceRange.min && priceRange.max ? priceRange : undefined,
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined
        }));
      } catch (err) {
        console.error('Failed to delete product:', err);
      }
    }
  };

  const handleStatusChange = async (productId, newStatus) => {
    try {
      await dispatch(updateProductStatus({ 
        productId, 
        status: newStatus, 
        reason: `Status changed to ${newStatus}` 
      }));
      // Refresh products list
      dispatch(fetchProducts({ 
        page: pagination?.currentPage || 1, 
        limit: pagination?.itemsPerPage || 20,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
        priceRange: priceRange.min && priceRange.max ? priceRange : undefined,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      }));
    } catch (err) {
      console.error('Failed to update product status:', err);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedProducts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to ${action} ${selectedProducts.length} products?`)) {
      try {
        await dispatch(bulkUpdateProducts({
          productIds: selectedProducts,
          action,
          data: { reason: `Bulk ${action} by admin` }
        }));
        setSelectedProducts([]);
        // Refresh products list
        dispatch(fetchProducts({ 
          page: pagination?.currentPage || 1, 
          limit: pagination?.itemsPerPage || 20,
          search: searchTerm,
          category: categoryFilter,
          status: statusFilter,
          priceRange: priceRange.min && priceRange.max ? priceRange : undefined,
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined
        }));
      } catch (err) {
        console.error(`Failed to ${action} products:`, err);
      }
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      await dispatch(exportProducts({
        format,
        filters: {
          search: searchTerm,
          category: categoryFilter,
          status: statusFilter
        }
      }));
    } catch (err) {
      console.error('Failed to export products:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      shortDescription: '',
      price: '',
      comparePrice: '',
      category: '',
      subcategory: '',
      brand: '',
      stock: '',
      minStock: '',
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
      specifications: [],
      sellerId: ''
    });
    setImageFiles([]);
    setImagePreview([]);
    setSelectedProduct(null);
    setHasUnsavedChanges(false);
    setAutoSaveStatus('saved');
    setLastSaved(null);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  };

  // Auto-save functionality
  const autoSave = async (data) => {
    if (!data.name || modalMode === 'view') return;
    
    try {
      setAutoSaveStatus('saving');
      
      // Simulate API call for auto-save (draft save)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would be an API call to save draft
      console.log('Auto-saving product draft:', data);
      
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    }
  };

  const debouncedAutoSave = (data) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    setHasUnsavedChanges(true);
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(data);
    }, 2000); // Auto-save after 2 seconds of inactivity
  };

  // Enhanced form data handler with auto-save
  const handleFormDataChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Trigger auto-save for editing mode
    if (modalMode === 'edit' && selectedProduct) {
      debouncedAutoSave(newFormData);
    }
  };

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(prev => [...prev, {
          url: e.target.result,
          name: file.name,
          isExisting: false
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle attributes management
  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, createAttributeRow()]
    }));
  };

  const removeAttribute = (attributeId) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter(a => a.id !== attributeId)
    }));
  };

  const updateAttribute = (attributeId, field, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId
          ? {
              ...a,
              [field]: value,
              ...(field === 'preset' && value !== CUSTOM_ATTRIBUTE_VALUE ? { customName: '' } : {})
            }
          : a
      )
    }));
  };

  const addAttributeValue = (attributeId) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId 
          ? { ...a, values: [...a.values, ''] }
          : a
      )
    }));
  };

  const removeAttributeValue = (attributeId, valueIndex) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => 
        a.id === attributeId 
          ? { ...a, values: a.values.filter((_, i) => i !== valueIndex) }
          : a
      )
    }));
  };

  const updateAttributeValue = (attributeId, valueIndex, value) => {
    setFormData(prev => ({
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

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, createVariantRow()]
    }));
  };

  const removeVariant = (variantId) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.id !== variantId)
    }));
  };

  const updateVariant = (variantId, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant) => (
        variant.id === variantId ? { ...variant, [field]: value } : variant
      ))
    }));
  };

  const updateVariantImage = (variantId, file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant) => (
        variant.id === variantId
          ? { ...variant, imageFile: file, imagePreview: previewUrl }
          : variant
      ))
    }));
  };

  const removeVariantImage = (variantId) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant) => (
        variant.id === variantId
          ? { ...variant, image: null, imageFile: null, imagePreview: '' }
          : variant
      ))
    }));
  };

  const openModal = (mode, product = null) => {
    setModalMode(mode);
    setSelectedProduct(product);
    if (product) {
      const sellerId = product?.sellerId
        || product?.seller?._id
        || product?.seller?.id
        || (typeof product?.seller === 'string' ? product.seller : '');

      setFormData(prev => ({
        ...prev,
        name: product?.name || '',
        description: product?.description || '',
        shortDescription: product?.shortDescription || '',
        price: product?.price ?? '',
        comparePrice: product?.comparePrice ?? '',
        category: product?.category?._id || product?.category?.id || product?.category || '',
        subcategory: product?.subcategory || '',
        brand: product?.brand || '',
        stock: product?.stock ?? '',
        minStock: product?.lowStockThreshold ?? product?.minStock ?? '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        images: Array.isArray(product?.images) ? product.images : [],
        status: product?.status || prev.status || 'active',
        productType: product?.productType || 'simple',
        isDigital: !!product?.isDigital,
        isFeatured: !!(product?.isFeatured ?? prev.isFeatured),
        weight: product?.weight || { value: '', unit: 'kg' },
        dimensions: product?.dimensions || { length: '', width: '', height: '', unit: 'cm' },
        shippingClass: product?.shippingClass || '',
        taxStatus: product?.taxStatus || 'taxable',
        taxClass: product?.taxClass || 'standard',
        seoTitle: product?.seoInfo?.metaTitle || product?.seoTitle || '',
        seoDescription: product?.seoInfo?.metaDescription || product?.seoDescription || '',
        seoKeywords: Array.isArray(product?.seoInfo?.keywords) ? product.seoInfo.keywords.join(', ') : (product?.seoKeywords || ''),
        sellerId,
        attributes: Array.isArray(product?.attributes)
          ? product.attributes.map(a => ({
              id: a.id || a._id || createRowId(),
              preset: ATTRIBUTE_PRESET_OPTIONS.find((option) => option.toLowerCase() === String(a.name || '').toLowerCase()) || CUSTOM_ATTRIBUTE_VALUE,
              customName: ATTRIBUTE_PRESET_OPTIONS.some((option) => option.toLowerCase() === String(a.name || '').toLowerCase()) ? '' : (a.name || ''),
              values: Array.isArray(a.values) ? a.values : [],
              variation: !!a.variation,
              visible: 'visible' in a ? !!a.visible : true
            }))
          : [],
        variants: Array.isArray(product?.variants)
          ? product.variants.map((variant, index) => {
              const rowId = variant.optionId || variant.id || variant._id || `${index}_${Date.now()}`;
              return {
                id: rowId,
                optionId: rowId,
                name: variant.name || '',
                value: variant.value || '',
                price: variant.price ?? '',
                stock: variant.stock ?? '',
                sku: variant.sku || '',
                image: variant.image || null,
                imageFile: null,
                imagePreview: variant.image?.url || '',
                imageUploadField: variant.imageUploadField || `variant_image_${rowId}`
              };
            })
          : [],
        specifications: Array.isArray(product?.specifications) ? product.specifications : [],
        tags: Array.isArray(product?.tags) ? product.tags : []
      }));
      setImageFiles([]);
      setImagePreview(
        Array.isArray(product?.images)
          ? product.images.map((image, index) => ({
              url: image?.url || image,
              name: image?.alt || `image-${index + 1}`,
              isExisting: true
            }))
          : []
      );
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryName = typeof product.category === 'object' ? product.category?.name : product.category;
    const matchesCategory = !categoryFilter || categoryName === categoryFilter;
    const matchesStatus = !statusFilter || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <p className="mt-2 text-gray-600">Manage all products in your marketplace</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {(Array.isArray(categories) ? categories : []).map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts(filteredProducts.map(p => p._id));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product._id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof product.category === 'object' ? product.category?.name : product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getProductDisplayPrice(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof product.seller === 'object' ? product.seller?.businessName || product.seller?.name : product.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal('view', product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openModal('edit', product)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                        {product.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(product._id, 'active')}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(product._id, 'rejected')}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <XMarkIcon className="w-5 h-5" />
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
                <span>
                  {modalMode === 'create' ? 'Add New Product' : 
                   modalMode === 'edit' ? 'Edit Product' : 'Product Details'}
                </span>
                {modalMode === 'edit' && (
                  <div className="flex items-center space-x-2 text-sm">
                    {autoSaveStatus === 'saving' && (
                      <span className="text-blue-600 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                        Saving...
                      </span>
                    )}
                    {autoSaveStatus === 'saved' && lastSaved && (
                      <span className="text-green-600 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Saved {new Date(lastSaved).toLocaleTimeString()}
                      </span>
                    )}
                    {autoSaveStatus === 'error' && (
                      <span className="text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        Save failed
                      </span>
                    )}
                    {hasUnsavedChanges && autoSaveStatus !== 'saving' && (
                      <span className="text-yellow-600">Unsaved changes</span>
                    )}
                  </div>
                )}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6 max-h-96 overflow-y-auto">
                {/* Product Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type
                  </label>
                  <select
                      value={formData.productType}
                      onChange={(e) => handleFormDataChange('productType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                    >
                    <option value="simple">Simple Product</option>
                    <option value="variable">Variable Product</option>
                    <option value="grouped">Grouped Product</option>
                    <option value="external">External/Affiliate Product</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormDataChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={modalMode === 'view'}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleFormDataChange('sku', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="Product SKU"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormDataChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={modalMode === 'view'}
                    >
                      <option value="">Select Category</option>
                      {Array.isArray(categories) && categories.map(category => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => handleFormDataChange('brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="Product brand"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleFormDataChange('price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={formData.productType !== 'variable'}
                      disabled={modalMode === 'view' || formData.productType === 'variable'}
                      placeholder={formData.productType === 'variable' ? 'Derived from variants' : '0.00'}
                    />
                    {formData.productType === 'variable' && (
                      <p className="mt-1 text-xs text-gray-500">The main product price is calculated from the lowest variant price.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compare Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.comparePrice}
                      onChange={(e) => handleFormDataChange('comparePrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleFormDataChange('stock', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={formData.productType !== 'variable'}
                      disabled={modalMode === 'view' || formData.productType === 'variable'}
                      placeholder={formData.productType === 'variable' ? 'Derived from variants' : '0'}
                    />
                    {formData.productType === 'variable' && (
                      <p className="mt-1 text-xs text-gray-500">The main stock is the total of all variant stock quantities.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => handleFormDataChange('minStock', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seller *
                    </label>
                    <select
                      value={formData.sellerId}
                      onChange={(e) => handleFormDataChange('sellerId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={modalMode === 'view'}
                    >
                      <option value="">Select Seller</option>
                      {Array.isArray(sellers) && sellers.map(seller => (
                        <option key={seller._id || seller.id} value={seller._id || seller.id}>
                          {seller.businessName || seller.name || seller.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormDataChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </div>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Description
                  </label>
                  <textarea
                      value={formData.shortDescription}
                      onChange={(e) => handleFormDataChange('shortDescription', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="Brief product description"
                    />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormDataChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={modalMode === 'view'}
                    placeholder="Enter detailed product description"
                  />
                </div>

                {/* Product Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <div className="space-y-2">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        <label htmlFor="images" className="cursor-pointer text-blue-600 hover:text-blue-500">
                          Upload images
                        </label>
                        <input
                          id="images"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={modalMode === 'view'}
                        />
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Image Preview */}
                  {imagePreview.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {imagePreview.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          {modalMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attributes */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Attributes
                    </label>
                    {modalMode !== 'view' && (
                      <button
                        type="button"
                        onClick={addAttribute}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Add Attribute
                      </button>
                    )}
                  </div>
                  
                  {formData.attributes.map((attribute, attributeIndex) => (
                    <div key={attribute.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="space-y-3">
                          <select
                            value={attribute.preset || ''}
                            onChange={(e) => updateAttribute(attribute.id, 'preset', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          >
                            <option value="">Select attribute field</option>
                            {ATTRIBUTE_PRESET_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                            <option value={CUSTOM_ATTRIBUTE_VALUE}>Custom</option>
                          </select>
                          {(attribute.preset === CUSTOM_ATTRIBUTE_VALUE || !attribute.preset) && (
                            <input
                              type="text"
                              value={attribute.customName || ''}
                              onChange={(e) => updateAttribute(attribute.id, 'customName', e.target.value)}
                              placeholder="Type custom field name e.g. SSD"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={modalMode === 'view'}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={attribute.variation}
                              onChange={(e) => updateAttribute(attribute.id, 'variation', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={modalMode === 'view'}
                            />
                            <span className="ml-2 text-sm text-gray-700">Used for variations</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={attribute.visible}
                              onChange={(e) => updateAttribute(attribute.id, 'visible', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={modalMode === 'view'}
                            />
                            <span className="ml-2 text-sm text-gray-700">Visible on product page</span>
                          </label>
                          {modalMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => removeAttribute(attribute.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Values</span>
                          {modalMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => addAttributeValue(attribute.id)}
                              className="text-blue-600 text-sm hover:text-blue-800"
                            >
                              Add Value
                            </button>
                          )}
                        </div>
                        
                        {attribute.values.map((value, valueIndex) => (
                          <div key={valueIndex} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateAttributeValue(attribute.id, valueIndex, e.target.value)}
                              placeholder="Attribute value e.g. 256GB"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              disabled={modalMode === 'view'}
                            />
                            {modalMode !== 'view' && (
                              <button
                                type="button"
                                onClick={() => removeAttributeValue(attribute.id, valueIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {formData.productType === 'variable' && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Product Variants
                      </label>
                      {modalMode !== 'view' && (
                        <button
                          type="button"
                          onClick={addVariant}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Add Variant
                        </button>
                      )}
                    </div>

                    {formData.variants.map((variant, variantIndex) => (
                      <div key={variant.id} className="border border-gray-200 rounded-lg p-4 mb-3 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Variant {variantIndex + 1}</p>
                            <p className="text-xs text-gray-500">Set a field, value, price, stock, and image for this option.</p>
                          </div>
                          {modalMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => removeVariant(variant.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                            placeholder="Field e.g. Color"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                          <input
                            type="text"
                            value={variant.value}
                            onChange={(e) => updateVariant(variant.id, 'value', e.target.value)}
                            placeholder="Value e.g. Red"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                            placeholder="Price"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                            placeholder="Stock quantity"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                            placeholder="Variant SKU"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => updateVariantImage(variant.id, e.target.files?.[0] || null)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={modalMode === 'view'}
                          />
                        </div>

                        {(variant.imagePreview || variant.image?.url) && (
                          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-3">
                            <img
                              src={variant.imagePreview || variant.image?.url}
                              alt={`${variant.name || 'Variant'} ${variant.value || 'image'}`}
                              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {variant.name || 'Variant'} {variant.value ? `- ${variant.value}` : ''}
                              </p>
                              <p className="text-xs text-gray-500">This image is used for the selected variant.</p>
                            </div>
                            {modalMode !== 'view' && (
                              <button
                                type="button"
                                onClick={() => removeVariantImage(variant.id)}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Remove image
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Product Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={modalMode === 'view'}
                    />
                    <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                      Featured Product
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDigital"
                      checked={formData.isDigital}
                      onChange={(e) => setFormData({...formData, isDigital: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={modalMode === 'view'}
                    />
                    <label htmlFor="isDigital" className="ml-2 text-sm text-gray-700">
                      Digital Product
                    </label>
                  </div>
                </div>

                {/* Physical Properties */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dimensions.length}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, length: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dimensions.width}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, width: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dimensions.height}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, height: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Shipping & Tax */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Class
                    </label>
                    <select
                      value={formData.shippingClass}
                      onChange={(e) => setFormData({...formData, shippingClass: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                    >
                      <option value="">No shipping class</option>
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="overnight">Overnight</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Status
                    </label>
                    <select
                      value={formData.taxStatus}
                      onChange={(e) => setFormData({...formData, taxStatus: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                    >
                      <option value="taxable">Taxable</option>
                      <option value="shipping">Shipping only</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Class
                    </label>
                    <select
                      value={formData.taxClass}
                      onChange={(e) => setFormData({...formData, taxClass: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                    >
                      <option value="">Standard</option>
                      <option value="reduced-rate">Reduced rate</option>
                      <option value="zero-rate">Zero rate</option>
                    </select>
                  </div>
                </div>

                {/* SEO Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">SEO Settings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData({...formData, seoTitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="SEO title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Description
                    </label>
                    <textarea
                      value={formData.seoDescription}
                      onChange={(e) => setFormData({...formData, seoDescription: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="SEO description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Keywords
                    </label>
                    <input
                      type="text"
                      value={formData.seoKeywords}
                      onChange={(e) => setFormData({...formData, seoKeywords: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={modalMode === 'view'}
                      placeholder="SEO keywords (comma separated)"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={modalMode === 'view'}
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                {/* Product Specifications */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Specifications
                    </label>
                    {modalMode !== 'view' && (
                      <button
                        type="button"
                        onClick={() => {
                          const newSpecs = [...formData.specifications, { key: '', value: '' }];
                          handleFormDataChange('specifications', newSpecs);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Add Specification
                      </button>
                    )}
                  </div>
                  
                  {formData.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 mb-3">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => {
                          const newSpecs = [...formData.specifications];
                          newSpecs[index].key = e.target.value;
                          handleFormDataChange('specifications', newSpecs);
                        }}
                        placeholder="Specification name"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={modalMode === 'view'}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...formData.specifications];
                            newSpecs[index].value = e.target.value;
                            handleFormDataChange('specifications', newSpecs);
                          }}
                          placeholder="Specification value"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={modalMode === 'view'}
                        />
                        {modalMode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => {
                              const newSpecs = formData.specifications.filter((_, i) => i !== index);
                              handleFormDataChange('specifications', newSpecs);
                            }}
                            className="text-red-600 hover:text-red-800 px-2"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Update Product'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
