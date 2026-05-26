import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, fetchFeaturedProducts, fetchHomepageContent, fetchProducts } from '../store/slices/productSlice';
import { formatCurrency } from '../utils/currency';

const heroSlides = [
  {
    title: 'Shop trusted products from local sellers',
    subtitle: 'Fast discovery, smooth ordering, and a clean multi-vendor experience built for modern commerce.',
    ctaText: 'Shop products',
    ctaLink: '/products'
  },
  {
    title: 'Turn your business into a marketplace store',
    subtitle: 'Create a general account first, then upgrade with business details when you are ready to sell.',
    ctaText: 'Become a seller',
    ctaLink: '/become-seller'
  },
  {
    title: 'Featured deals get top placement',
    subtitle: 'Highlight priority products first, then keep latest products visible for fresh discovery every day.',
    ctaText: 'See all products',
    ctaLink: '/products'
  }
];

const promoCards = [
  { title: 'Sell on Gule', text: 'Open your seller profile and start listing products.', ctaText: 'Sell now', ctaLink: '/become-seller' },
  { title: 'Track Orders', text: 'Manage orders and follow deliveries with confidence.', ctaText: 'Shop now', ctaLink: '/products' },
  { title: 'Browse All', text: 'Jump straight into the full marketplace catalog.', ctaText: 'See all products', ctaLink: '/products' }
];

const renderStars = (rating = 0) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, index) => (
      <svg
        key={index}
        className={`h-4 w-4 ${index < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const ProductCard = ({ product, badge }) => (
  <div className="group rounded-2xl bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
    <div className="relative h-56 bg-gray-50 flex items-center justify-center">
      <img
        src={product.images?.[0]?.url || 'https://via.placeholder.com/300'}
        alt={product.images?.[0]?.alt || product.name}
        className="max-h-full max-w-full object-contain p-4"
      />
      {badge && (
        <span className="absolute left-3 top-3 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </div>
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
        {product.seller?.businessName || 'Marketplace Seller'}
      </p>
      <Link to={`/product/${product._id || product.id}`} className="mt-2 block text-lg font-semibold text-gray-900 group-hover:text-primary-600">
        {product.name}
      </Link>
      <div className="mt-3 flex items-center gap-2">
        {renderStars(product.averageRating || product.rating || 0)}
        <span className="text-sm text-gray-500">
          {(product.averageRating || product.rating || 0).toFixed ? (product.averageRating || product.rating || 0).toFixed(1) : (product.averageRating || product.rating || 0)} ({product.reviewCount || 0})
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price, product.currency)}</p>
          {product.comparePrice && product.comparePrice > product.price && (
            <p className="text-sm text-gray-400 line-through">{formatCurrency(product.comparePrice, product.currency)}</p>
          )}
        </div>
        <Link
          to={`/product/${product._id || product.id}`}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          View
        </Link>
      </div>
    </div>
  </div>
);

const Home = () => {
  const dispatch = useDispatch();
  const { featuredProducts, products, categories, homepageContent, loading } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchProducts({ limit: 16 }));
    dispatch(fetchCategories());
    dispatch(fetchHomepageContent());
  }, [dispatch]);

  useEffect(() => {
    const slideCount = Math.max((homepageContent?.heroBanners || []).filter((item) => item.isActive !== false).length, heroSlides.length);
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slideCount);
    }, 5000);

    return () => clearInterval(timer);
  }, [homepageContent]);

  const activeHeroSlides = useMemo(() => {
    const managedSlides = (homepageContent?.heroBanners || [])
      .filter((item) => item.isActive !== false)
      .map((item) => ({ ...item }));

    return managedSlides.length > 0 ? managedSlides : heroSlides;
  }, [homepageContent]);

  useEffect(() => {
    if (activeSlide >= activeHeroSlides.length) {
      setActiveSlide(0);
    }
  }, [activeHeroSlides, activeSlide]);

  const activePromoCards = useMemo(() => {
    const managedAds = (homepageContent?.promoAds || []).filter((item) => item.isActive !== false);
    return managedAds.length > 0 ? managedAds : promoCards;
  }, [homepageContent]);

  const topCategories = useMemo(() => {
    const highlightedCategoryIds = homepageContent?.highlightedCategoryIds || [];
    if (!highlightedCategoryIds.length) {
      return (categories || []).slice(0, 10);
    }

    const highlighted = highlightedCategoryIds
      .map((id) => (categories || []).find((category) => String(category.id || category._id) === String(id)))
      .filter(Boolean);

    return highlighted.length > 0 ? highlighted.slice(0, 10) : (categories || []).slice(0, 10);
  }, [categories, homepageContent]);
  const latestProducts = useMemo(() => (products || []).slice(0, 16), [products]);
  const prioritizedFeatured = Array.isArray(featuredProducts) ? featuredProducts.slice(0, 8) : [];
  const activeHero = activeHeroSlides[activeSlide] || activeHeroSlides[0] || heroSlides[0];
  const sellerCtaLink = user?.userType === 'buyer' ? '/become-seller' : user?.userType === 'seller' ? '/seller/dashboard' : '/signup';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Categories</h2>
              <Link to="/categories" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                See all
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {topCategories.length > 0 ? topCategories.map((category) => (
                <Link
                  key={category.id || category._id}
                  to={`/products?category=${encodeURIComponent(category.name)}`}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-gray-400">{category.subcategories?.length || 0}</span>
                </Link>
              )) : (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="h-11 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl shadow-lg">
            {activeHero?.imageUrl ? (
              <img
                src={activeHero.imageUrl}
                alt={activeHero.title}
                className="h-[360px] w-full object-cover sm:h-[420px]"
              />
            ) : (
              <div className="h-[360px] w-full bg-slate-900 sm:h-[420px]" />
            )}

            {activeHero?.showOverlay !== false && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
            )}
            <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
              {activeHero?.showContent !== false ? (
                <>
                  <div className="max-w-2xl">
                    <h1 className={`text-3xl font-black leading-tight text-white ${activeHero?.showOverlay !== false ? 'drop-shadow-sm' : ''} sm:text-5xl`}>
                      {activeHero.title}
                    </h1>
                    <p className={`mt-4 max-w-xl text-sm ${activeHero?.showOverlay !== false ? 'text-white/90 drop-shadow-sm' : 'text-white'} sm:text-lg`}>
                      {activeHero.subtitle}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={activeHero.ctaLink || '/products'}
                        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                      >
                        {activeHero.ctaText || 'Shop products'}
                      </Link>
                      <Link
                        to={sellerCtaLink}
                        className="rounded-full border border-white/70 bg-black/25 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/40"
                      >
                        {user?.userType === 'seller' ? 'Open seller dashboard' : 'Sell now'}
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeHeroSlides.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveSlide(index)}
                          className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/60'}`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-end">
                  <div className="flex items-center gap-2 rounded-full bg-black/20 px-4 py-3 backdrop-blur-sm">
                    {activeHeroSlides.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/60'}`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div />
            </div>
          </div>

          <div className="space-y-4">
            {activePromoCards.map((card) => (
              <Link
                key={card.title}
                to={card.ctaLink || '/products'}
                className="block rounded-2xl bg-white shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                {card.imageUrl && (
                  <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex aspect-[5/3] items-center justify-center p-3">
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                )}
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">{card.title}</p>
                <p className="mt-2 text-sm text-gray-600">{card.text}</p>
                <p className="mt-3 text-sm font-semibold text-slate-900">{card.ctaText || 'Learn more'}</p>
              </Link>
            ))}
          </div>
        </section>

        {prioritizedFeatured.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Top priority</p>
                <h2 className="text-3xl font-black text-gray-900">Featured products</h2>
                <p className="mt-2 text-gray-600">Featured listings appear first before regular newly posted products.</p>
              </div>
              <Link to="/products" className="text-sm font-semibold text-primary-600 hover:text-primary-500">
                See all products
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {prioritizedFeatured.map((product) => (
                <ProductCard key={product._id || product.id} product={product} badge="Featured" />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                {prioritizedFeatured.length > 0 ? 'Fresh arrivals' : 'Newly posted'}
              </p>
              <h2 className="text-3xl font-black text-gray-900">
                {prioritizedFeatured.length > 0 ? 'Latest products' : 'New products in four rows'}
              </h2>
              <p className="mt-2 text-gray-600">
                {prioritizedFeatured.length > 0
                  ? 'Recent listings stay visible after featured items so buyers can keep discovering new stock.'
                  : 'No featured products are available yet, so the newest product listings take over the spotlight.'}
              </p>
            </div>
            <Link to="/products" className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              See all products
            </Link>
          </div>

          {loading && latestProducts.length === 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))}
            </div>
          ) : latestProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {latestProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} badge={product.isFeatured ? 'Featured' : 'New'} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">No products yet</h3>
              <p className="mt-2 text-gray-600">Start onboarding sellers and the latest products will appear here automatically.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
