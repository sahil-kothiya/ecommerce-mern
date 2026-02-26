import { createSlice } from "@reduxjs/toolkit";

// Cart is managed server-side. This slice holds the last-known server state
// for optimistic UI only. All mutations go through the cart API endpoints.
const initialState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  loading: false,
};

const calculateTotals = (items) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0,
  );
  return { totalItems, totalAmount };
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Hydrate slice from server response after any cart API call
    setCart: (state, action) => {
      const items = action.payload?.items ?? [];
      state.items = items;
      const { totalItems, totalAmount } = calculateTotals(items);
      state.totalItems = totalItems;
      state.totalAmount = totalAmount;
    },

    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalAmount = 0;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCart, clearCart, setLoading } = cartSlice.actions;
export default cartSlice.reducer;
