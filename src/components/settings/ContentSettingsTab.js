import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { fetchHomepageContent, updateHomepageContent } from '../../store/slices/settingsSlice';

const createHeroBanner = (index = 0) => ({
  id: `hero-${Date.now()}-${index}`,
  title: '',
  subtitle: '',
  ctaText: '',
  ctaLink: '/products',
  imageUrl: '',
  publicId: '',
  showOverlay: true,
  showContent: true,
  isActive: true,
  imageFile: null,
  imageUploadField: `hero_banner_${index}`
});

const createPromoAd = (index = 0) => ({
  id: `promo-${Date.now()}-${index}`,
  title: '',
  text: '',
  ctaText: '',
  ctaLink: '/products',
  imageUrl: '',
  publicId: '',
  isActive: true,
  imageFile: null,
  imageUploadField: `promo_ad_${index}`
});

const mapHomepageContentToLocal = (content = {}) => ({
  heroBanners: (content?.heroBanners || []).map((item, index) => ({
    ...item,
    showOverlay: item?.showOverlay !== false,
    showContent: item?.showContent !== false,
    isActive: item?.isActive !== false,
    imageFile: null,
    imageUploadField: `hero_banner_${index}`
  })),
  promoAds: (content?.promoAds || []).map((item, index) => ({
    ...item,
    isActive: item?.isActive !== false,
    imageFile: null,
    imageUploadField: `promo_ad_${index}`
  })),
  highlightedCategoryIds: content?.highlightedCategoryIds || []
});

const ContentSettingsTab = () => {
  const dispatch = useDispatch();
  const { homepageContent, loading } = useSelector((state) => state.settings);
  const [localContent, setLocalContent] = useState(mapHomepageContentToLocal());
  const [isDirty, setIsDirty] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    dispatch(fetchHomepageContent());
  }, [dispatch]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data?.data?.categories || []);
      } catch (error) {
        toast.error('Failed to load categories');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (isDirty) {
      return;
    }

    setLocalContent(mapHomepageContentToLocal(homepageContent));
  }, [homepageContent, isDirty]);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category?.id || category?._id),
    [categories]
  );

  const updateHeroBanner = (index, key, value) => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      ))
    }));
  };

  const updatePromoAd = (index, key, value) => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      promoAds: prev.promoAds.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      ))
    }));
  };

  const addHeroBanner = () => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      heroBanners: [...prev.heroBanners, createHeroBanner(prev.heroBanners.length)]
    }));
  };

  const addPromoAd = () => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      promoAds: [...prev.promoAds, createPromoAd(prev.promoAds.length)]
    }));
  };

  const removeHeroBanner = (index) => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const removePromoAd = (index) => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      promoAds: prev.promoAds.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const toggleCategory = (categoryId) => {
    setIsDirty(true);
    setLocalContent((prev) => ({
      ...prev,
      highlightedCategoryIds: prev.highlightedCategoryIds.includes(categoryId)
        ? prev.highlightedCategoryIds.filter((id) => id !== categoryId)
        : [...prev.highlightedCategoryIds, categoryId]
    }));
  };

  const handleSaveContent = async () => {
    try {
      const updatedContent = await dispatch(updateHomepageContent(localContent)).unwrap();
      setIsDirty(false);
      setLocalContent(mapHomepageContentToLocal(updatedContent));
      toast.success('Homepage content updated');
    } catch (error) {
      toast.error(error || 'Failed to update homepage content');
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    try {
      await api.post('/admin/categories', {
        name: categoryForm.name,
        description: categoryForm.description,
        status: 'active',
        order: categoryOptions.length
      });

      const refreshed = await api.get('/categories');
      setCategories(refreshed.data?.data?.categories || []);
      setCategoryForm({ name: '', description: '' });
      toast.success('Category created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Homepage Content</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload carousel banners, manage right-side ads, and choose which categories to highlight on the storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveContent}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Save Content
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Hero Banners</h4>
            <p className="text-sm text-gray-500">These banners drive the landing page carousel. The uploaded image now fills the whole banner. Recommended image size: `1600 x 720`.</p>
          </div>
          <button
            type="button"
            onClick={addHeroBanner}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Banner
          </button>
        </div>

        <div className="space-y-6">
          {localContent.heroBanners.map((banner, index) => (
            <div key={banner.id || index} className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Banner {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeHeroBanner(index)}
                  className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="mr-1 h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={banner.title}
                  onChange={(e) => updateHeroBanner(index, 'title', e.target.value)}
                  placeholder="Banner title"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  value={banner.ctaText}
                  onChange={(e) => updateHeroBanner(index, 'ctaText', e.target.value)}
                  placeholder="CTA text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <textarea
                rows={3}
                value={banner.subtitle}
                onChange={(e) => updateHeroBanner(index, 'subtitle', e.target.value)}
                placeholder="Banner subtitle"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={banner.ctaLink}
                  onChange={(e) => updateHeroBanner(index, 'ctaLink', e.target.value)}
                  placeholder="/products"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updateHeroBanner(index, 'imageFile', e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <p className="text-xs text-gray-500">
                Recommended hero ratio: `20:9` or `1600 x 720`. The image becomes the full banner. Use the checkboxes below to choose whether each banner should show the shadow overlay and whether text/buttons should appear on top.
              </p>

              {banner.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-50">
                  <div className="aspect-[20/9]">
                    <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={banner.showOverlay !== false}
                    onChange={(e) => updateHeroBanner(index, 'showOverlay', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span>Show shadow overlay</span>
                </label>

                <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={banner.showContent !== false}
                    onChange={(e) => updateHeroBanner(index, 'showContent', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span>Show text and buttons</span>
                </label>

                <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={banner.isActive}
                    onChange={(e) => updateHeroBanner(index, 'isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span>Active banner</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Promo Ads</h4>
            <p className="text-sm text-gray-500">These show in the right-side promo area on the homepage. Recommended image size: `600 x 360`.</p>
          </div>
          <button
            type="button"
            onClick={addPromoAd}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Ad
          </button>
        </div>

        <div className="space-y-6">
          {localContent.promoAds.map((ad, index) => (
            <div key={ad.id || index} className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Ad {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removePromoAd(index)}
                  className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="mr-1 h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={ad.title}
                  onChange={(e) => updatePromoAd(index, 'title', e.target.value)}
                  placeholder="Ad title"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  value={ad.ctaText}
                  onChange={(e) => updatePromoAd(index, 'ctaText', e.target.value)}
                  placeholder="CTA text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <textarea
                rows={2}
                value={ad.text}
                onChange={(e) => updatePromoAd(index, 'text', e.target.value)}
                placeholder="Ad description"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={ad.ctaLink}
                  onChange={(e) => updatePromoAd(index, 'ctaLink', e.target.value)}
                  placeholder="/products"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updatePromoAd(index, 'imageFile', e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <p className="text-xs text-gray-500">
                Recommended promo ratio: `5:3` or `600 x 360` for clean right-side display.
              </p>

              {ad.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-50">
                  <div className="flex aspect-[5/3] items-center justify-center p-4">
                    <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-contain" />
                  </div>
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ad.isActive}
                  onChange={(e) => updatePromoAd(index, 'isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                />
                Active ad
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">Highlighted Categories</h4>
              <p className="text-sm text-gray-500">Choose which categories appear first in the storefront category list.</p>
            </div>
            <PhotoIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto">
            {categoryOptions.map((category) => {
              const categoryId = category.id || category._id;
              return (
                <label key={categoryId} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={localContent.highlightedCategoryIds.includes(categoryId)}
                    onChange={() => toggleCategory(categoryId)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">Quick Category Creator</h4>
              <p className="text-sm text-gray-500">Create a new category here, or open the full category manager for advanced control.</p>
            </div>
            <TagIcon className="h-5 w-5 text-gray-400" />
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Category name"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
            <textarea
              rows={3}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Category description"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Category
              </button>
              <Link
                to="/admin/categories"
                className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                Open Category Manager
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContentSettingsTab;
