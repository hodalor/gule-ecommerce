export const formatPrice = (value, currency = 'GHS') => {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} ${currency}`;
};

export const buildVariantLabel = (variant) => {
  if (!variant) {
    return '';
  }

  const name = String(
    variant.variantName || variant.name || ''
  ).trim();
  const value = String(
    variant.variantValue || variant.value || ''
  ).trim();

  if (name && value) {
    return `${name}: ${value}`;
  }

  return name || value || '';
};

export const buildCartKey = (productId, variant) => {
  const variantId = variant?.optionId || variant?.id || '';
  return variantId ? `${productId}::${variantId}` : String(productId || '');
};

export const getCartQuantityForKey = (items = [], cartKey) => (
  (Array.isArray(items) ? items : []).find((item) => item.cartKey === cartKey)?.quantity || 0
);

export const getProductPriceRange = (product) => {
  const min = Number(product?.priceRange?.min);
  const max = Number(product?.priceRange?.max);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return { min, max };
  }

  const variantPrices = (Array.isArray(product?.variants) ? product.variants : [])
    .map((variant) => Number(variant?.price))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (variantPrices.length > 0) {
    return {
      min: Math.min(...variantPrices),
      max: Math.max(...variantPrices)
    };
  }

  const basePrice = Number(product?.price || 0);
  return {
    min: basePrice,
    max: basePrice
  };
};

export const getProductDisplayPrice = (product, currency = 'GHS') => {
  const { min, max } = getProductPriceRange(product);

  if (min === max) {
    return formatPrice(min, currency);
  }

  return `${formatPrice(min, currency)} - ${formatPrice(max, currency)}`;
};
