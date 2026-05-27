import { createSlice } from '@reduxjs/toolkit';
import { buildCartKey } from '../../utils/cart';

const initialState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  isOpen: false,
};

const recalculateTotals = (state) => {
  state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
  state.totalAmount = state.items.reduce(
    (total, item) => total + (item.price * item.quantity),
    0
  );
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const {
        productId,
        name,
        price,
        image,
        quantity = 1,
        variant,
        sellerId,
        selectedVariant
      } = action.payload;
      const normalizedVariant = selectedVariant || variant || null;
      const cartKey = action.payload.cartKey || buildCartKey(productId, normalizedVariant);
      const existingItem = state.items.find(item => item.cartKey === cartKey);

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = price;
        existingItem.image = image;
        existingItem.variant = normalizedVariant;
      } else {
        state.items.push({
          cartKey,
          productId,
          name,
          price,
          image,
          quantity,
          variant: normalizedVariant,
          sellerId
        });
      }

      recalculateTotals(state);
    },
    removeFromCart: (state, action) => {
      const cartKey = typeof action.payload === 'string'
        ? action.payload
        : action.payload?.cartKey;
      state.items = state.items.filter(item => item.cartKey !== cartKey);
      recalculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { cartKey, quantity } = action.payload;
      const item = state.items.find(item => item.cartKey === cartKey);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((entry) => entry.cartKey !== cartKey);
        } else {
          item.quantity = quantity;
        }

        recalculateTotals(state);
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalAmount = 0;
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    openCart: (state) => {
      state.isOpen = true;
    },
    closeCart: (state) => {
      state.isOpen = false;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  toggleCart,
  openCart,
  closeCart,
} = cartSlice.actions;

export default cartSlice.reducer;
