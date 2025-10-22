import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../store/slices/productSlice';

const Categories = () => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { categories, loading, error } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle retry on error
  const handleRetry = () => {
    dispatch(fetchCategories());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Categories</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Browse Categories
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Discover products organized by category
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCategories.map((category) => (
            <div key={category.name} className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-w-16 aspect-h-12">
                <img
                  src={category.image || `https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=${encodeURIComponent(category.name)}`}
                  alt={category.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="hover:text-indigo-600">
                    {category.name}
                  </Link>
                </h3>
                
                <p className="text-sm text-gray-600 mb-3">
                  {category.description || 'Explore products in this category'}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-indigo-600">
                    {(category.count || 0).toLocaleString()} products
                  </span>
                </div>

                {/* Subcategories */}
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Popular Subcategories
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {category.subcategories.slice(0, 3).map((sub, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                        >
                          {sub}
                        </span>
                      ))}
                      {category.subcategories.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                          +{category.subcategories.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Link
                  to={`/products?category=${encodeURIComponent(category.name)}`}
                  className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or browse all categories.
            </p>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="bg-indigo-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {categories.length}
              </div>
              <div className="text-sm font-medium text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {categories.reduce((sum, cat) => sum + (cat.count || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-600">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {categories.reduce((sum, cat) => sum + (cat.subcategories ? cat.subcategories.length : 0), 0)}
              </div>
              <div className="text-sm font-medium text-gray-600">Subcategories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">24/7</div>
              <div className="text-sm font-medium text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;