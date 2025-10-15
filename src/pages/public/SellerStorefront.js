import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  StarIcon, 
  MapPinIcon, 
  ClockIcon, 
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { fetchProducts } from '../../store/slices/productSlice';
import { addToCart } from '../../store/slices/cartSlice';
import toast from 'react-hot-toast';

const SellerStorefront = () => {
  const { sellerId } = useParams();
  const dispatch = useDispatch();
  const { products, loading, pagination } = useSelector(state => state.products);
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('products');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  // Mock seller data - in real app, this would come from API
  const seller = {
    id: sellerId,
    name: 'TechWorld Electronics',
    businessName: 'TechWorld Electronics Ltd.',
    description: 'Your trusted partner for quality electronics and gadgets. We specialize in smartphones, laptops, accessories, and smart home devices.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
    rating: 4.8,
    totalReviews: 2847,
    totalProducts: 156,
    totalSales: 12450,
    joinedDate: '2020-03-15',
    location: 'Lagos, Nigeria',
    responseTime: '2 hours',
    verified: true,
    contact: {
      phone: '+234 801 234 5678',
      email: 'contact@techworld.com',
      website: 'www.techworld.com'
    },
    policies: {
      shipping: 'Free shipping on orders over ₦50,000',
      returns: '30-day return policy',
      warranty: '1-year warranty on all electronics'
    },
    badges: ['Verified Seller', 'Top Rated', 'Fast Shipping']
  };

  useEffect(() => {
    dispatch(fetchProducts({ 
      page: 1, 
      limit: 12, 
      seller: sellerId,
      sortBy 
    }));
  }, [dispatch, sellerId, sortBy]);

  const handleAddToCart = (product) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    
    dispatch(addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      quantity: 1
    }));
    toast.success('Product added to cart!');
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIconSolid
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  const filteredProducts = products.filter(product => {
    if (priceRange === 'all') return true;
    if (priceRange === 'under-50k') return product.price < 50000;
    if (priceRange === '50k-100k') return product.price >= 50000 && product.price <= 100000;
    if (priceRange === 'over-100k') return product.price > 100000;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary-600 to-primary-800">
        <img
          src={seller.coverImage}
          alt="Store Cover"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Seller Profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg"
                />
                {seller.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Seller Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {seller.name}
                    </h1>
                    <p className="text-gray-600 mb-2">{seller.businessName}</p>
                    
                    {/* Rating and Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {renderStars(seller.rating)}
                        <span className="ml-1 font-medium">{seller.rating}</span>
                        <span>({seller.totalReviews.toLocaleString()} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{seller.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>Responds in {seller.responseTime}</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {seller.badges.map((badge, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                      <EnvelopeIcon className="h-4 w-4" />
                      Contact Seller
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <HeartIcon className="h-4 w-4" />
                      Follow
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <ShareIcon className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {seller.totalProducts}
                </div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {seller.totalSales.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Sales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(seller.joinedDate).getFullYear()}
                </div>
                <div className="text-sm text-gray-600">Joined</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'products', name: 'Products', count: seller.totalProducts },
                { id: 'about', name: 'About' },
                { id: 'reviews', name: 'Reviews', count: seller.totalReviews },
                { id: 'policies', name: 'Policies' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'products' && (
              <div>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Range
                    </label>
                    <select
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All Prices</option>
                      <option value="under-50k">Under ₦50,000</option>
                      <option value="50k-100k">₦50,000 - ₦100,000</option>
                      <option value="over-100k">Over ₦100,000</option>
                    </select>
                  </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                        <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Link to={`/product/${product.id}`}>
                          <div className="relative">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-t-lg"
                            />
                            {product.discount > 0 && (
                              <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
                                -{product.discount}%
                              </span>
                            )}
                          </div>
                        </Link>
                        
                        <div className="p-4">
                          <Link to={`/product/${product.id}`}>
                            <h3 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 line-clamp-2">
                              {product.name}
                            </h3>
                          </Link>
                          
                          <div className="flex items-center gap-1 mb-2">
                            {renderStars(product.rating)}
                            <span className="text-sm text-gray-600 ml-1">
                              ({product.reviews})
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-lg font-bold text-gray-900">
                                {formatPrice(product.price)}
                              </span>
                              {product.originalPrice && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <ShoppingCartIcon className="h-4 w-4" />
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredProducts.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600">Try adjusting your filters to see more products.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About Our Store</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {seller.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-700">{seller.contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-700">{seller.contact.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-700">{seller.contact.website}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Store Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary-600">{seller.totalProducts}</div>
                      <div className="text-sm text-gray-600">Total Products</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary-600">{seller.totalSales.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Sales</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary-600">{seller.rating}</div>
                      <div className="text-sm text-gray-600">Average Rating</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary-600">{seller.responseTime}</div>
                      <div className="text-sm text-gray-600">Response Time</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <StarIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Reviews Coming Soon</h3>
                  <p className="text-gray-600">Customer reviews will be displayed here.</p>
                </div>
              </div>
            )}

            {activeTab === 'policies' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Policy</h3>
                  <p className="text-gray-700">{seller.policies.shipping}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Return Policy</h3>
                  <p className="text-gray-700">{seller.policies.returns}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Warranty</h3>
                  <p className="text-gray-700">{seller.policies.warranty}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerStorefront;