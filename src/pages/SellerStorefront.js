import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSellerById } from '../store/slices/sellerSlice';
import { fetchProducts } from '../store/slices/productSlice';

const SellerStorefront = () => {
  const { sellerId } = useParams();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('products');

  // Select seller and product state from Redux
  const { currentSeller, loading: sellersLoading, error: sellersError } = useSelector(state => state.sellers);
  const { products } = useSelector(state => state.products);

  // Normalize seller data shape for the storefront view
  const seller = currentSeller ? {
    _id: currentSeller._id || currentSeller.id,
    businessName: currentSeller.businessDetails?.businessName || currentSeller.fullName || [currentSeller.firstName, currentSeller.lastName].filter(Boolean).join(' '),
    name: currentSeller.fullName || [currentSeller.firstName, currentSeller.lastName].filter(Boolean).join(' '),
    description: currentSeller.businessDetails?.businessDescription || currentSeller.description,
    rating: currentSeller.rating || currentSeller.averageRating || 0,
    totalReviews: currentSeller.totalReviews || (Array.isArray(currentSeller.reviews) ? currentSeller.reviews.length : 0),
    totalSales: currentSeller.totalSales || 0,
    joinedDate: currentSeller.registrationDate || currentSeller.createdAt,
    location: currentSeller.businessDetails?.businessAddress || currentSeller.address?.city || currentSeller.location,
    avatar: currentSeller.profilePicture || currentSeller.profileImage || currentSeller.avatar,
    banner: currentSeller.storeBanner || currentSeller.banner,
  } : null;

  const loading = sellersLoading?.currentSeller || false;
  const error = (typeof sellersError === 'string' ? sellersError : sellersError?.currentSeller) || null;

  useEffect(() => {
    if (sellerId) {
      // Fetch seller details and products by sellerId
      dispatch(fetchSellerById(sellerId));
      dispatch(fetchProducts({ sellerId }));
    }
  }, [dispatch, sellerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller Not Found</h2>
            <p className="text-gray-600">{error || 'The seller you are looking for does not exist.'}</p>
            <Link to="/products" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'products', name: 'Products', count: products?.length || 0 },
    { id: 'about', name: 'About' },
    { id: 'reviews', name: 'Reviews', count: seller?.reviews?.length || 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Banner */}
      <div className="relative h-64 bg-gradient-to-r from-indigo-500 to-purple-600">
        <img
          src={seller.banner || 'https://picsum.photos/1200/300?random=9'}
          alt={seller.businessName || seller.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Store Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 pb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <img
                  src={seller.avatar || 'https://picsum.photos/150/150?random=10'}
                  alt={seller.businessName || seller.name}
                  className="h-20 w-20 rounded-full border-4 border-white shadow-lg"
                />
                <div className="ml-6">
                  <h1 className="text-2xl font-bold text-gray-900">{seller.businessName || seller.name}</h1>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <svg
                          key={rating}
                          className={`${
                            (seller.rating || 0) > rating ? 'text-yellow-400' : 'text-gray-300'
                          } h-5 w-5 flex-shrink-0`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {seller.rating || 0} ({seller.totalReviews || 0} reviews)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {seller.totalSales || 0} sales • Joined {seller.joinedDate ? new Date(seller.joinedDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <button className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  Follow Store
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {activeTab === 'products' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products?.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <Link to={`/product/${product._id}`}>
                      <img
                        src={product.images?.[0] || 'https://picsum.photos/300/300?random=11'}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-indigo-600">${product.price}</span>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-sm text-gray-600">{product.rating || 0} ({product.reviewCount || 0})</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About {seller.businessName || seller.name}</h2>
              <p className="text-gray-700 mb-6">{seller.description || 'No description available.'}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Store Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="text-sm text-gray-900">{seller.location || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                      <dd className="text-sm text-gray-900">{seller.joinedDate ? new Date(seller.joinedDate).toLocaleDateString() : 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Sales</dt>
                      <dd className="text-sm text-gray-900">{(seller.totalSales || 0).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Store Policies</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 30-day return policy</li>
                    <li>• Free shipping on orders over $50</li>
                    <li>• 24/7 customer support</li>
                    <li>• Secure payment processing</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {seller.reviews?.map((review) => (
                <div key={review._id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {review.customerName?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900">{review.customerName || 'Anonymous'}</h4>
                        <div className="flex items-center mt-1">
                          {[0, 1, 2, 3, 4].map((rating) => (
                            <svg
                              key={rating}
                              className={`${
                                (review.rating || 0) > rating ? 'text-yellow-400' : 'text-gray-300'
                              } h-4 w-4 flex-shrink-0`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {review.date ? new Date(review.date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-700">{review.comment || 'No comment provided.'}</p>
                    <p className="text-sm text-gray-500 mt-2">Product: {review.product || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerStorefront;