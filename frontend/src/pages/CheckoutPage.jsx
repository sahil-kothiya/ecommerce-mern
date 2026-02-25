import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import authService from "../services/authService";
import paymentService from "../services/paymentService";
import { API_CONFIG } from "../constants";
import notify from "../utils/notify";

const schema = yup.object({
    firstName: yup.string().trim().required("First name is required"),
    lastName: yup.string().trim().required("Last name is required"),
    email: yup.string().trim().required("Email is required").email("Enter a valid email"),
    phone: yup.string().trim().required("Phone is required").matches(/^[\d\s()+-]{10,}$/, "Enter a valid phone number"),
    address1: yup.string().trim().required("Address is required"),
    address2: yup.string().default(""),
    city: yup.string().trim().required("City is required"),
    state: yup.string().default(""),
    postCode: yup.string().trim().required("Post code is required"),
    country: yup.string().default("US"),
    paymentMethod: yup.string().oneOf(["cod", "stripe"]).default("cod"),
    notes: yup.string().default(""),
});

// ============================================================================
// US STATE DATA
// ============================================================================
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

// ============================================================================
// SEARCHABLE SELECT COMPONENT
// ============================================================================
const SearchableSelect = ({ value, onChange, options, placeholder, hasError, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [rect, setRect] = useState(null);
    const buttonRef = useRef(null);
    const inputRef = useRef(null);

    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
    );
    const selectedLabel = options.find((o) => o.value === value)?.label || "";

    // Recompute position on open / resize / scroll
    const reposition = useCallback(() => {
        if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    }, []);

    useEffect(() => {
        if (!open) return;
        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, { passive: true, capture: true });
        return () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, { capture: true });
        };
    }, [open, reposition]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target) &&
                !document.getElementById("ss-portal")?.contains(e.target)
            ) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleOpen = () => {
        if (disabled) return;
        reposition();
        setOpen(true);
        setQuery("");
        setTimeout(() => inputRef.current?.focus(), 40);
    };

    const handleSelect = (opt) => {
        onChange(opt.value);
        setOpen(false);
        setQuery("");
    };

    // Portal dropdown — fully outside any stacking context
    const dropdown = open && rect ? createPortal(
        <div
            id="ss-portal"
            style={{
                position: "fixed",
                top: (() => {
                    const spaceBelow = window.innerHeight - rect.bottom;
                    return spaceBelow < 240 && rect.top > 240 ? undefined : rect.bottom + 4;
                })(),
                bottom: (() => {
                    const spaceBelow = window.innerHeight - rect.bottom;
                    return spaceBelow < 240 && rect.top > 240 ? window.innerHeight - rect.top + 4 : undefined;
                })(),
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
            <div className="border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                    />
                    {query && (
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-600">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                    <li className="px-4 py-3 text-center text-xs text-slate-400">No results found</li>
                ) : (
                    filtered.map((opt) => (
                        <li
                            key={opt.value}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                            className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[rgba(66,80,213,0.06)] ${
                                opt.value === value
                                    ? "bg-[rgba(66,80,213,0.08)] font-semibold text-[#4250d5]"
                                    : "text-[#1f1f1f]"
                            }`}
                        >
                            <span className="flex-1">{opt.label}</span>
                            {opt.value === value && (
                                <svg className="h-3.5 w-3.5 flex-shrink-0 text-[#4250d5]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </li>
                    ))
                )}
            </ul>
        </div>,
        document.body
    ) : null;

    return (
        <div>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className={`relative w-full rounded-xl border px-4 py-3 pr-10 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[rgba(66,80,213,0.25)] ${
                    hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
                } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
                <span className={selectedLabel ? "text-[#1f1f1f]" : "text-slate-400"}>
                    {selectedLabel || placeholder}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            {dropdown}
        </div>
    );
};

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: { fontSize: "15px", color: "#1f1f1f", fontFamily: "inherit", "::placeholder": { color: "#adb5bd" } },
        invalid: { color: "#e03131" },
    },
};

const StripeCardSection = () => (
    <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
        <div className="mb-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-semibold text-purple-800">Secure Card Payment</span>
            <span className="ml-auto text-xs text-purple-500">Powered by Stripe</span>
        </div>
        <div className="rounded-lg border border-purple-200 bg-white px-4 py-3">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="mt-2 text-xs text-purple-500">Your card is encrypted. We never store card details.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {["VISA", "MasterCard", "Amex", "Discover"].map((b) => (
                <span key={b} className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono">{b}</span>
            ))}
        </div>
    </div>
);

const AddressPicker = ({ addresses, selectedId, onSelect, onAddNew }) => {
    if (!addresses || !addresses.length) return null;
    return (
        <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Saved Addresses</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {addresses.map((addr) => (
                    <button
                        key={addr._id}
                        type="button"
                        onClick={() => onSelect(addr)}
                        className={`rounded-xl border p-3 text-left text-xs transition ${
                            selectedId === addr._id
                                ? "border-[#4250d5] bg-[rgba(66,80,213,0.06)] ring-1 ring-[#4250d5]"
                                : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                    >
                        <div className="mb-1 flex items-center gap-1.5">
                            {addr.label && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {addr.label}
                                </span>
                            )}
                            {addr.isDefault && (
                                <span className="rounded bg-[rgba(66,80,213,0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[#4250d5]">
                                    Default
                                </span>
                            )}
                            {selectedId === addr._id && (
                                <svg className="ml-auto h-3.5 w-3.5 text-[#4250d5]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <p className="font-semibold text-[#1f1f1f]">{addr.firstName} {addr.lastName}</p>
                        <p className="text-slate-500">{addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}</p>
                        <p className="text-slate-500">
                            {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postCode}
                        </p>
                        <p className="text-slate-500">{addr.country}</p>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onAddNew}
                    className={`flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs font-semibold transition ${
                        selectedId === "new"
                            ? "border-[#4250d5] bg-[rgba(66,80,213,0.04)] text-[#4250d5]"
                            : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                    }`}
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Use a different address
                </button>
            </div>
            <div className="my-4 border-t border-slate-100" />
        </div>
    );
};

const CheckoutForm = ({ stripeAvailable, savedAddresses }) => {
    const navigate = useNavigate();
    const stripe = useStripe();
    const elements = useElements();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

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

    const createOrder = async (formData, paymentIntentId = null) => {
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`, {
            method: "POST",
            headers: authService.getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ ...formData, paymentIntentId }),
        });
        const result = await res.json();
        if (!res.ok || !result?.success) throw new Error(result?.message || "Failed to place order");
        return result;
    };

    const onSubmit = async (data) => {
        try {
            setIsPlacingOrder(true);

            if (data.paymentMethod === "stripe") {
                if (!stripe || !elements) {
                    notify.error("Stripe is not ready. Please wait and try again.");
                    return;
                }
                const intentData = await paymentService.createPaymentIntent();
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
                const result = await createOrder(data, paymentIntent.id);
                notify.success(`Order placed! #${result?.data?.orderNumber || ""}`);
            } else {
                const result = await createOrder(data);
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
                                    placeholder="State *"
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
    const [cart, setCart] = useState({
        items: [],
        summary: { totalItems: 0, subTotal: 0, shippingCost: 0, totalAmount: 0 },
    });
    const [isLoading, setIsLoading] = useState(true);
    const [stripeAvailable, setStripeAvailable] = useState(false);
    const [stripePromise, setStripePromise] = useState(null);
    const [savedAddresses, setSavedAddresses] = useState([]);

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
                                        ${Number(item.amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="my-3 border-t border-slate-100" />
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>${Number(cart.summary?.subTotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Shipping</span>
                                <span>
                                    {cart.summary?.shippingCost === 0 ? (
                                        <span className="font-medium text-green-600">Free</span>
                                    ) : (
                                        `$${Number(cart.summary?.shippingCost || 0).toFixed(2)}`
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-[#131313]">
                                <span>Total</span>
                                <span>${Number(cart.summary?.totalAmount || 0).toFixed(2)}</span>
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
