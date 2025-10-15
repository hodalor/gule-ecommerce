import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  HeartIcon,
  ShoppingCartIcon,
  TrashIcon,
  StarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { addToCart } from '../store/slices/cartSlice';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // TODO: Replace with actual wishlist slice when implemented
  // For now, using empty array until wishlist API is created
  const wishlistItems = [];

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    const cartItem = {
      product: {
        _id: product.id,
        name: product.name,
        price: product.price,
        images: [product.image],
        seller: { name: product.seller }
      },
      quantity: 1
    };

    dispatch(addToCart(cartItem));
    toast.success('Product added to cart!');
  };

  const handleRemoveFromWishlist = (productId) => {
    // In a real app, this would dispatch an action to remove from wishlist
    toast.success('Item removed from wishlist');
  };

  const handleMoveAllToCart = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    const inStockItems = wishlistItems.filter(item => item.inStock);
    
    inStockItems.forEach(item => {
      const cartItem = {
        product: {
          _id: item.id,
          name: item.name,
          price: item.price,
          images: [item.image],
          seller: { name: item.seller }
        },
        quantity: 1
      };
      dispatch(addToCart(cartItem));
    });

    toast.success(`${inStockItems.length} items added to cart!`);
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <HeartIcon className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="mt-2 text-gray-600">
              Save items you love to your wishlist and shop them later.
            </p>
            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Start Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-1">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleMoveAllToCart}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              Add All to Cart
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                
                {/* Discount Badge */}
                {item.discount && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                    -{item.discount}%
                  </div>
                )}

                {/* Remove from Wishlist */}
                <button
                  onClick={() => handleRemoveFromWishlist(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <HeartIconSolid className="h-5 w-5 text-red-500" />
                </button>

                {/* Out of Stock Overlay */}
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">Out of Stock</span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-4">
                <div className="mb-2">
                  <Link
                    to={`/product/${item.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">by {item.seller}</p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(item.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.rating} ({item.reviews})
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-gray-900">
                    ${item.price}
                  </span>
                  {item.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${item.originalPrice}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.inStock}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                  <button
                    onClick={() => handleRemoveFromWishlist(item.id)}
                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">You might also like</h2>
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-600 text-center">
              Based on your wishlist, we'll show you personalized recommendations here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;