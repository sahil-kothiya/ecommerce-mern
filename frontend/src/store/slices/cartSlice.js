import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: JSON.parse(localStorage.getItem('cart') || '[]'),
    totalItems: 0,
    totalAmount: 0,
    loading: false,
};

// Calculate totals
const calculateTotals = (items) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems, totalAmount };
};

const cartSlice = createSlice({
    name: 'cart',
    initialState: (() => {
        const { totalItems, totalAmount } = calculateTotals(initialState.items);
        return { ...initialState, totalItems, totalAmount };
    })(),
    reducers: {
        addToCart: (state, action) => {
            const existingItem = state.items.find(
                (item) =>
                    item.productId === action.payload.productId &&
                    item.variantId === action.payload.variantId
            );

            if (existingItem) {
                existingItem.quantity += action.payload.quantity;
            } else {
                state.items.push(action.payload);
            }

            const { totalItems, totalAmount } = calculateTotals(state.items);
            state.totalItems = totalItems;
            state.totalAmount = totalAmount;
            localStorage.setItem('cart', JSON.stringify(state.items));
        },

        updateCartItem: (state, action) => {
            const item = state.items.find((item) => item._id === action.payload.id);
            if (item) {
                item.quantity = action.payload.quantity;
                const { totalItems, totalAmount } = calculateTotals(state.items);
                state.totalItems = totalItems;
                state.totalAmount = totalAmount;
                localStorage.setItem('cart', JSON.stringify(state.items));
            }
        },

        removeFromCart: (state, action) => {
            state.items = state.items.filter((item) => item._id !== action.payload);
            const { totalItems, totalAmount } = calculateTotals(state.items);
            state.totalItems = totalItems;
            state.totalAmount = totalAmount;
            localStorage.setItem('cart', JSON.stringify(state.items));
        },

        clearCart: (state) => {
            state.items = [];
            state.totalItems = 0;
            state.totalAmount = 0;
            localStorage.removeItem('cart');
        },

        setLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const { addToCart, updateCartItem, removeFromCart, clearCart, setLoading } =
    cartSlice.actions;
export default cartSlice.reducer;
