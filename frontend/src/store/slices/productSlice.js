import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    products: [],
    product: null,
    loading: false,
    error: null,
    filters: {},
    pagination: {
        page: 1,
        limit: 12,
        total: 0,
    },
};

const productSlice = createSlice({
    name: 'product',
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.products = action.payload;
        },
        setProduct: (state, action) => {
            state.product = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = {};
        },
        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
    },
});

export const {
    setProducts,
    setProduct,
    setLoading,
    setError,
    setFilters,
    clearFilters,
    setPagination,
} = productSlice.actions;

export default productSlice.reducer;
