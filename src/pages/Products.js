import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import toast from 'react-hot-toast';
import {
  buildCartKey,
  formatPrice,
  getCartQuantityForKey,
  getProductDisplayPrice
} from '../utils/cart';

const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="h-52 animate-pulse bg-slate-100" />
    <div className="space-y-3 p-4">
      <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
  </div>
);

const Products = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, categories, loading, error } = useSelector(state => state.products);
  const { isAuthenticated } = useSelector(state => state.auth);
  const { items: cartItems } = useSelector(state => state.cart);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Read sellerId from URL query params
  const [searchParams] = useSearchParams();
  const sellerIdParam = searchParams.get('sellerId');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch, sellerIdParam]);

  const handleAddToCart = (product) => {
    const isVariableProduct = product?.productType === 'variable' && Array.isArray(product?.variants) && product.variants.length > 0;

    if (isVariableProduct) {
      navigate(`/product/${product._id}`);
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      return;
    }

    const cartKey = buildCartKey(product._id);
    const existingCartQty = getCartQuantityForKey(cartItems, cartKey);
    const stock = Number(product?.stock || 0);
    const available = Math.max(0, stock - existingCartQty);
    if (available <= 0) {
      toast.error('Out of stock');
      return;
    }

    const cartItem = {
      cartKey,
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      quantity: 1,
      sellerId: (product.seller && typeof product.seller === 'object')
        ? (product.seller._id || product.seller.id || product.seller.businessName || product.seller.name)
        : product.seller
    };

    if (available < 1) {
      toast.error('No more available');
      return;
    }

    dispatch(addToCart(cartItem));
    toast.success(`${product.name} added to cart!`);
  };

  useEffect(() => {
    const filters = {
      search: searchTerm,
      ...(selectedCategory && selectedCategory !== 'all' ? { category: selectedCategory } : {}),
      ...(sellerIdParam ? { sellerId: sellerIdParam } : {})
    };
    dispatch(fetchProducts(filters));
  }, [dispatch, searchTerm, selectedCategory, sortBy, sellerIdParam]);



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const hasConnectionIssue = error.toLowerCase().includes('network');
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-16">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="text-2xl font-black text-slate-900">Products are temporarily unavailable</div>
            <p className="mt-3 text-sm text-slate-600">{error}</p>
            {hasConnectionIssue && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The storefront could not reach the backend. If the API was still starting, retry now and the page should recover automatically.
              </div>
            )}
          <button 
            onClick={() => {
              const retryFilters = {
                search: searchTerm,
                ...(selectedCategory && selectedCategory !== 'all' ? { category: selectedCategory } : {}),
                ...(sellerIdParam ? { sellerId: sellerIdParam } : {})
              };
              dispatch(fetchProducts(retryFilters));
            }}
            className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Retry Products
          </button>
        </div>
        </div>
      </div>
    );
  }
  // Categories for filter dropdown
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...(categories || []).map(cat => ({ value: cat.name, label: cat.name }))
  ];

  // Filter and sort products
  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    // Rely on server-side category filtering to avoid mismatches between name vs ObjectId
    return matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return (b.rating || b.averageRating || 0) - (a.rating || a.averageRating || 0);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Ensure featured products appear first while preserving current sort within groups
  const displayProducts = [
    ...sortedProducts.filter(p => p.isFeatured || p.featured),
    ...sortedProducts.filter(p => !(p.isFeatured || p.featured))
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        className={`h-4 w-4 ${index < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Marketplace catalog</p>
              <h1 className="mt-2 text-4xl font-black text-slate-900">All Products</h1>
              <p className="mt-2 text-slate-600">Discover featured listings, fresh arrivals, and trusted seller inventory.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{products?.length || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Showing</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{displayProducts.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCategory === 'all' ? 'All' : selectedCategory}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sellerIdParam && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded">
                Seller Filter Active
              </span>
              <span className="text-sm text-indigo-800">
                Showing products from selected seller
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to={`/seller/${sellerIdParam}`} className="text-sm text-indigo-700 hover:text-indigo-900">
                View seller
              </Link>
              <Link to="/products" className="text-sm text-indigo-700 hover:text-indigo-900">
                Clear
              </Link>
            </div>
          </div>
        )}
        {/* Filters */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for products..."
                className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                {categoryOptions.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="rating">Rating (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-slate-600">
            Showing {displayProducts.length} of {products?.length || 0} products
          </p>
        </div>

        {/* Products Grid */}
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayProducts.map((product) => (
              <div
                key={product._id}
                className={`${(product.isFeatured || product.featured) ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white'} overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div className="relative bg-white h-48 flex items-center justify-center">
                  <img
                    src={product.images?.[0]?.url || '/api/placeholder/300/300'}
                    alt={product.images?.[0]?.alt || product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                  {(product.isFeatured || product.featured) && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                      Featured
                    </div>
                  )}
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                      Sale
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-2">by {product.seller?.businessName || product.seller?.name || 'Unknown Seller'}</p>

                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {renderStars(product.rating || 0)}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {product.rating || 0} ({product.reviewCount || 0} reviews)
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-gray-900">
                        {getProductDisplayPrice(product)}
                      </span>
                      {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {product?.productType === 'variable' && (
                    <p className="mb-4 text-xs font-medium uppercase tracking-wide text-indigo-600">
                      Choose variant for exact price and stock
                    </p>
                  )}

                  <div className="flex space-x-2">
                    <Link
                      to={`/product/${product._id}`}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-center text-white transition-colors duration-200 hover:bg-slate-700"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 rounded-xl bg-primary-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={
                        product?.productType !== 'variable'
                        && (Number(product?.stock || 0) - getCartQuantityForKey(cartItems, buildCartKey(product._id))) <= 0
                      }
                    >
                      {product?.productType === 'variable'
                        ? 'Choose Options'
                        : ((Number(product?.stock || 0) - getCartQuantityForKey(cartItems, buildCartKey(product._id))) > 0 ? 'Add to Cart' : 'Out of Stock')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.816-6.207-2.175.168-.288.336-.576.504-.864C7.207 10.175 9.34 9 12 9s4.793 1.175 5.703 2.961c.168.288.336.576.504.864A7.962 7.962 0 0112 15z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
