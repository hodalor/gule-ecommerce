import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSellers, fetchSellerCategories, clearError } from '../store/slices/sellerSlice';

const Sellers = () => {
  const dispatch = useDispatch();
  const { sellers, categories, loading, error, stats } = useSelector((state) => state.sellers);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  // Fetch categories on mount only
  useEffect(() => {
    dispatch(fetchSellerCategories());
  }, [dispatch]);

  // Fetch sellers when filters change
  useEffect(() => {
    dispatch(fetchSellers({ search: searchTerm, category: selectedCategory, sortBy }));
  }, [dispatch, searchTerm, selectedCategory, sortBy]);

  // Filter and sort sellers locally for better UX
  const filteredSellers = sellers
    .filter(seller => {
      const matchesSearch = seller.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           seller.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || seller.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'products':
          return (b.productCount || 0) - (a.productCount || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'newest':
          return new Date(b.joinedDate) - new Date(a.joinedDate);
        default:
          return 0;
      }
    });

  // Correctly handle loading/error states
  if (loading?.sellers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sellers...</p>
        </div>
      </div>
    );
  }

  const sellersError = typeof error === 'string' ? error : error?.sellers;
  if (sellersError) {
    const message = typeof sellersError === 'string' ? sellersError : 'Failed to load sellers';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Sellers</h1>
          <p className="mt-2 text-gray-600">Explore top-rated sellers and their stores</p>
          
          {/* Search and Filters */}
          <div className="mt-6 flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search sellers..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="rating">Highest Rated</option>
              <option value="products">Most Products</option>
              <option value="reviews">Most Reviews</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sellers Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="p-6">
                {/* Seller Header */}
                <div className="flex items-start space-x-4">
                  <img
                    src={seller.avatar || 'https://via.placeholder.com/80x80/6366F1/FFFFFF?text=S'}
                    alt={seller.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{seller.businessName || seller.name}</h3>
                    <p className="text-sm text-gray-600">{seller.description}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{seller.rating} ★</span>
                      <span className="text-gray-500 text-xs">{seller.reviewCount} reviews</span>
                      <span className="text-gray-500 text-xs">{seller.productCount} products</span>
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Top Products</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(seller.topProducts || []).slice(0, 3).map((product, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex space-x-3">
                  <Link
                    to={`/seller/${seller.id}`}
                    className="flex-1 text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/products?sellerId=${seller.id}`}
                    className="flex-1 text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    View Products
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredSellers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m4 4h-1m-1 4h.01M12 8V4m0 0L8 8m4-4l4 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sellers found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters to find sellers.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sellers;