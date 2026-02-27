import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import authService from "../services/authService";
import apiClient from "../services/apiClient";
import paymentService from "../services/paymentService";
import { API_CONFIG } from "../constants";
import notify from "../utils/notify";
import { useSiteSettings } from "../context/useSiteSettings";
import SearchableSelect from "../components/checkout/SearchableSelect.jsx";
import StripeCardSection from "../components/checkout/StripeCardSection.jsx";
import AddressPicker from "../components/checkout/AddressPicker.jsx";

const schema = yup.object({
    firstName: yup.string().trim().required("First name is required"),
    lastName: yup.string().trim().required("Last name is required"),
    email: yup.string().trim().required("Email is required").email("Enter a valid email"),
    phone: yup.string().trim().required("Phone is required").matches(/^[\d\s()+-]{10,}$/, "Enter a valid phone number"),
    address1: yup.string().trim().required("Address is required"),
    address2: yup.string().default(""),
    city: yup.string().trim().required("City is required"),
    state: yup.string().default(""),  // Optional for international addresses
    postCode: yup.string().trim().required("Post code is required"),
    country: yup.string().default("US"),
    paymentMethod: yup.string().oneOf(["cod", "stripe"]).default("cod"),
    notes: yup.string().default(""),
});

const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia", "Puerto Rico", "Guam",
];

const STATE_OPTIONS = US_STATES.map((s) => ({ value: s, label: s }));

const CheckoutForm = ({ stripeAvailable, savedAddresses }) => {
    const navigate = useNavigate();
    const stripe = useStripe();
    const elements = useElements();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const orderAttemptKeyRef = useRef("");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            firstName: "", lastName: "", email: "", phone: "",
            address1: "", address2: "", city: "", state: "",
            postCode: "", country: "US", paymentMethod: "cod", notes: "",
        },
        mode: "onBlur",
    });

    const applyAddress = useCallback(
        (addr) => {
            setSelectedAddressId(addr._id);
            setValue("firstName", addr.firstName || "");
            setValue("lastName", addr.lastName || "");
            setValue("phone", addr.phone || "");
            setValue("address1", addr.address1 || "");
            setValue("address2", addr.address2 || "");
            setValue("city", addr.city || "");
            setValue("state", addr.state || "");
            setValue("postCode", addr.postCode || "");
        },
        [setValue]
    );

    useEffect(() => {
        const user = authService.getUser();
        reset((prev) => ({
            ...prev,
            firstName: user?.name?.split(" ")?.[0] || "",
            lastName: user?.name?.split(" ")?.slice(1).join(" ") || "",
            email: user?.email || "",
        }));
        if (savedAddresses && savedAddresses.length > 0) {
            const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
            applyAddress(def);
        } else {
            setSelectedAddressId("new");
        }
    }, [savedAddresses, reset, applyAddress]);

    const handleAddNew = () => {
        setSelectedAddressId("new");
        setValue("phone", "");
        setValue("address1", "");
        setValue("address2", "");
        setValue("city", "");
        setValue("state", "");
        setValue("postCode", "");
    };

    const paymentMethod = watch("paymentMethod");

    const fieldClass = (field) =>
        `w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-[rgba(66,80,213,0.25)] ${
            errors[field] ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
        }`;

    const getOrderAttemptKey = () => {
        if (orderAttemptKeyRef.current) {
            return orderAttemptKeyRef.current;
        }
        const generated =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        orderAttemptKeyRef.current = generated;
        return generated;
    };

    const createOrder = async (formData, paymentIntentId = null, idempotencyKey = "") => {
        const headers = {};
        if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
        return apiClient.post(
            `${API_CONFIG.ENDPOINTS.ORDERS}`,
            { ...formData, paymentIntentId },
            { headers },
        );
    };

    const onSubmit = async (data) => {
        try {
            setIsPlacingOrder(true);
            const orderAttemptKey = getOrderAttemptKey();

            if (data.paymentMethod === "stripe") {
                if (!stripe || !elements) {
                    notify.error("Stripe is not ready. Please wait and try again.");
                    return;
                }
                const intentData = await paymentService.createPaymentIntent(orderAttemptKey);
                const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
                    payment_method: {
                        card: elements.getElement(CardElement),
                        billing_details: {
                            name: `${data.firstName} ${data.lastName}`.trim(),
                            email: data.email,
                            phone: data.phone,
                            address: { line1: data.address1, city: data.city, postal_code: data.postCode },
                        },
                    },
                });
                if (error) {
                    notify.error(error.message || "Payment failed");
                    return;
                }
                if (paymentIntent.status !== "succeeded") {
                    notify.error("Payment was not successful. Please try again.");
                    return;
                }
                const result = await createOrder(data, paymentIntent.id, orderAttemptKey);
                notify.success(`Order placed! #${result?.data?.orderNumber || ""}`);
            } else {
                const result = await createOrder(data, null, orderAttemptKey);
                notify.success(`Order placed! #${result?.data?.orderNumber || ""}`);
            }

            window.dispatchEvent(new Event("cart:changed"));
            navigate("/account/orders");
        } catch (error) {
            notify.error(error, "Failed to place order");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Shipping */}
            <div className="store-surface p-6">
                <h2 className="store-display mb-4 text-lg text-[#131313]">Shipping Information</h2>
                <AddressPicker
                    addresses={savedAddresses}
                    selectedId={selectedAddressId}
                    onSelect={applyAddress}
                    onAddNew={handleAddNew}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <input {...register("firstName")} placeholder="First Name *" className={fieldClass("firstName")} />
                        {errors.firstName && (
                            <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                        )}
                    </div>
                    <div>
                        <input {...register("lastName")} placeholder="Last Name *" className={fieldClass("lastName")} />
                        {errors.lastName && (
                            <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                        )}
                    </div>
                    <div>
                        <input {...register("email")} type="email" placeholder="Email *" className={fieldClass("email")} />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                        )}
                    </div>
                    <div>
                        <input {...register("phone")} placeholder="Phone *" className={fieldClass("phone")} />
                        {errors.phone && (
                            <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <input {...register("address1")} placeholder="Address Line 1 *" className={fieldClass("address1")} />
                        {errors.address1 && (
                            <p className="mt-1 text-xs text-red-600">{errors.address1.message}</p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <input
                            {...register("address2")}
                            placeholder="Address Line 2 (Optional)"
                            className={fieldClass("address2")}
                        />
                    </div>
                    <div>
                        <input {...register("city")} placeholder="City *" className={fieldClass("city")} />
                        {errors.city && (
                            <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
                        )}
                    </div>
                    <div>
                        <Controller
                            name="state"
                            control={control}
                            render={({ field }) => (
                                <SearchableSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={STATE_OPTIONS}
                                    placeholder="State (Optional)"
                                    hasError={!!errors.state}
                                />
                            )}
                        />
                        {errors.state && (
                            <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
                        )}
                    </div>
                    <div>
                        <input {...register("postCode")} placeholder="Post Code *" className={fieldClass("postCode")} />
                        {errors.postCode && (
                            <p className="mt-1 text-xs text-red-600">{errors.postCode.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment */}
            <div className="store-surface p-6">
                <h2 className="store-display mb-4 text-lg text-[#131313]">Payment Method</h2>
                <div className="space-y-2.5">
                    <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                            paymentMethod === "cod"
                                ? "border-[#4250d5] bg-[rgba(66,80,213,0.04)]"
                                : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <input type="radio" value="cod" {...register("paymentMethod")} className="accent-[#4250d5]" />
                        <span className="text-xl">&#x1F69A;</span>
                        <div>
                            <p className="text-sm font-semibold text-[#1f1f1f]">Cash on Delivery</p>
                            <p className="text-xs text-slate-500">Pay when your order arrives</p>
                        </div>
                    </label>

                    {stripeAvailable && (
                        <label
                            className={`flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                                paymentMethod === "stripe"
                                    ? "border-purple-400 bg-purple-50/50"
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    value="stripe"
                                    {...register("paymentMethod")}
                                    className="accent-purple-600"
                                />
                                <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-[#1f1f1f]">Pay with Card</p>
                                    <p className="text-xs text-slate-500">Visa, Mastercard, Amex &mdash; secured by Stripe</p>
                                </div>
                                <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                    TEST MODE
                                </span>
                            </div>
                            {paymentMethod === "stripe" && <StripeCardSection />}
                        </label>
                    )}
                </div>
            </div>

            {/* Notes */}
            <div className="store-surface p-6">
                <textarea
                    {...register("notes")}
                    rows={3}
                    placeholder="Order notes (optional)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(66,80,213,0.25)]"
                />
            </div>

            <button
                type="submit"
                disabled={isPlacingOrder || (paymentMethod === "stripe" && (!stripe || !elements))}
                className="store-btn-primary tap-bounce w-full rounded-2xl py-4 text-base font-bold disabled:opacity-50"
            >
                {isPlacingOrder ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        {paymentMethod === "stripe" ? "Processing Payment..." : "Placing Order..."}
                    </span>
                ) : paymentMethod === "stripe" ? "Pay & Place Order" : "Place Order"}
            </button>
        </form>
    );
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const [cart, setCart] = useState({
        items: [],
        summary: { totalItems: 0, subTotal: 0, shippingCost: 0, totalAmount: 0 },
    });
    const [isLoading, setIsLoading] = useState(true);
    const [stripeAvailable, setStripeAvailable] = useState(false);
    const [stripePromise, setStripePromise] = useState(null);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const currencyCode = String(settings?.currencyCode || "USD").toUpperCase();
    const formatMoney = useCallback(
        (amount) => {
            try {
                return new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currencyCode,
                    maximumFractionDigits: 2,
                }).format(Number(amount || 0));
            } catch {
                return `${settings?.currencySymbol || "$"}${Number(amount || 0).toFixed(2)}`;
            }
        },
        [currencyCode, settings?.currencySymbol],
    );

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [cartRes, addressRes, paymentConfig] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                    headers: authService.getAuthHeaders(),
                    credentials: "include",
                }),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/addresses`, {
                    headers: authService.getAuthHeaders(),
                    credentials: "include",
                }),
                paymentService.getConfig().catch(() => ({ stripeEnabled: false, publicKey: "" })),
            ]);

            const cartData = await cartRes.json();
            if (!cartRes.ok || !cartData?.success) throw new Error(cartData?.message || "Failed to load cart");
            setCart(cartData.data);

            if (addressRes.ok) {
                const addrData = await addressRes.json();
                const addrs = addrData?.data?.addresses || addrData?.data || [];
                setSavedAddresses(Array.isArray(addrs) ? addrs : []);
            }

            if (paymentConfig?.publicKey) {
                setStripeAvailable(true);
                setStripePromise(loadStripe(paymentConfig.publicKey));
            }
        } catch (error) {
            notify.error(error, "Failed to load checkout");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="store-surface p-10 text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#d2dff9] border-t-[#4250d5]" />
                    <p className="store-display text-sm text-[#212191]">Loading checkout...</p>
                </div>
            </div>
        );
    }

    if (!cart.items?.length) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <div className="store-surface p-10 text-center">
                    <div className="mb-3 text-5xl">&#x1F6D2;</div>
                    <h2 className="store-display mb-2 text-xl text-[#212191]">Your cart is empty</h2>
                    <button
                        onClick={() => navigate("/cart")}
                        className="store-btn-primary tap-bounce mt-4 rounded-2xl px-8 py-3 text-sm font-bold"
                    >
                        Go to Cart
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="store-eyebrow mb-1">Secure Checkout</p>
                <h1 className="store-display text-2xl text-[#131313] sm:text-3xl">Complete Your Order</h1>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Elements stripe={stripePromise}>
                        <CheckoutForm
                            stripeAvailable={stripeAvailable}
                            savedAddresses={savedAddresses}
                        />
                    </Elements>
                </div>
                <div className="lg:col-span-1">
                    <div className="store-surface sticky top-28 p-5">
                        <h2 className="store-display mb-4 text-base text-[#131313]">Order Summary</h2>
                        <div className="space-y-2.5 text-sm">
                            {cart.items.map((item) => (
                                <div key={item._id} className="flex items-start justify-between gap-2">
                                    <span className="flex-1 truncate text-[#444]">
                                        {item.product?.title || "Product"}{" "}
                                        <span className="text-[#888]">x{item.quantity}</span>
                                    </span>
                                    <span className="font-semibold text-[#1f1f1f]">
                                        {formatMoney(item.amount || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="my-3 border-t border-slate-100" />
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>{formatMoney(cart.summary?.subTotal || 0)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Shipping</span>
                                <span>
                                    {cart.summary?.shippingCost === 0 ? (
                                        <span className="font-medium text-green-600">Free</span>
                                    ) : (
                                        formatMoney(cart.summary?.shippingCost || 0)
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-[#131313]">
                                <span>Total</span>
                                <span>{formatMoney(cart.summary?.totalAmount || 0)}</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            SSL encrypted checkout
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
