import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../constants';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useSiteSettings } from '../../context/useSiteSettings';
import { formatCurrency } from '../../utils/currency';

// ============================================================================
// CONSTANTS
// ============================================================================
const STATUS_CONFIG = {
    new:       { label: 'Order Placed',  badge: 'bg-blue-100 text-blue-700 ring-blue-200',      dot: 'bg-blue-500',   step: 1 },
    process:   { label: 'Processing',    badge: 'bg-yellow-100 text-yellow-700 ring-yellow-200', dot: 'bg-yellow-500', step: 2 },
    shipped:   { label: 'Shipped',       badge: 'bg-purple-100 text-purple-700 ring-purple-200', dot: 'bg-purple-500', step: 3 },
    delivered: { label: 'Delivered',     badge: 'bg-green-100 text-green-700 ring-green-200',    dot: 'bg-green-500',  step: 4 },
    cancelled: { label: 'Cancelled',     badge: 'bg-red-100 text-red-700 ring-red-200',          dot: 'bg-red-400',    step: 0 },
};

const PAYMENT_BADGE = {
    paid:     'bg-green-100 text-green-700 ring-green-200',
    unpaid:   'bg-orange-100 text-orange-700 ring-orange-200',
    refunded: 'bg-purple-100 text-purple-700 ring-purple-200',
};

const PAYMENT_METHOD_LABEL = {
    cod:    'Cash on Delivery',
    stripe: 'Credit / Debit Card',
    paypal: 'PayPal',
};

const TRACKING_STEPS = [
    { step: 1, label: 'Order Placed' },
    { step: 2, label: 'Processing' },
    { step: 3, label: 'Shipped' },
    { step: 4, label: 'Delivered' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const Badge = ({ className, children }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${className}`}>
        {children}
    </span>
);

const OrderTracker = ({ status }) => {
    if (status === 'cancelled') {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
                <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-red-700">This order has been cancelled</span>
            </div>
        );
    }

    const currentStep = STATUS_CONFIG[status]?.step || 1;

    return (
        <div className="relative flex items-start justify-between px-2">
            {/* Background connector */}
            <div className="absolute left-0 right-0 top-4 mx-8 h-0.5 bg-slate-200" />
            {/* Active progress */}
            <div
                className="absolute left-0 top-4 mx-8 h-0.5 bg-blue-500 transition-all duration-700"
                style={{ width: `${((currentStep - 1) / (TRACKING_STEPS.length - 1)) * 100}%` }}
            />
            {TRACKING_STEPS.map(({ step, label }) => {
                const done   = step < currentStep;
                const active = step === currentStep;
                return (
                    <div key={step} className="relative z-10 flex min-w-[60px] flex-col items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                            done   ? 'border-blue-500 bg-blue-500 text-white' :
                            active ? 'border-blue-500 bg-white text-blue-600 shadow-md shadow-blue-100' :
                                     'border-slate-200 bg-white text-slate-400'
                        }`}>
                            {done ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="text-xs font-bold">{step}</span>
                            )}
                        </div>
                        <span className={`text-center text-xs font-medium leading-tight ${
                            active ? 'text-blue-700' : done ? 'text-blue-500' : 'text-slate-400'
                        }`}>{label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const pickOrderItemImage = (item) => {
    if (item?.variantImage) return item.variantImage;
    if (item?.image) return item.image;
    if (Array.isArray(item?.images) && item.images.length) {
        return item.images.find((image) => image?.isPrimary) || item.images[0];
    }
    return null;
};

const ItemRow = ({ item, orderId, canReview, settings }) => {
    const imgSrc      = resolveImageUrl(pickOrderItemImage(item));
    const title       = item.title || item.name || item.productName || 'Product';
    const price       = Number(item.price    || 0);
    const qty         = Number(item.quantity || 1);
    const amount      = Number(item.amount   || price * qty);
    const productLink = item.productId ? `/products/${item.productId}` : null;

    const Thumbnail = (
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {imgSrc ? (
                <img
                    src={imgSrc}
                    alt={title}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = resolveImageUrl(null); }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex items-start gap-4 py-4">
            {productLink
                ? <Link to={productLink} className="flex-shrink-0">{Thumbnail}</Link>
                : Thumbnail}

            <div className="min-w-0 flex-1">
                {productLink ? (
                    <Link to={productLink} className="font-semibold leading-snug text-slate-800 hover:text-blue-600 transition-colors">
                        {title}
                    </Link>
                ) : (
                    <p className="font-semibold leading-snug text-slate-800">{title}</p>
                )}
                {item.sku && <p className="mt-0.5 text-xs text-slate-400">SKU: {item.sku}</p>}
                <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">{qty}</span>
                    <span className="text-slate-400"> × </span>
                    <span>{formatCurrency(price, settings)}</span>
                </p>
            </div>
            <div className="flex-shrink-0 text-right">
                <p className="text-base font-bold text-slate-800">{formatCurrency(amount, settings)}</p>
                {canReview && productLink && (
                    <Link
                        to={`${productLink}?orderId=${orderId}`}
                        className="mt-2 inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                        Rate & Review
                    </Link>
                )}
            </div>
        </div>
    );
};

const PriceSummary = ({ order, settings }) => {
    const sub      = Number(order.subTotal       || 0);
    const shipping = Number(order.shippingCost   || 0);
    const discount = Number(order.couponDiscount || 0);
    const total    = Number(order.totalAmount    || 0);
    const itemCount = order.quantity || order.items?.length || 0;

    return (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Price Details</h4>
            <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                    <span>{formatCurrency(sub, settings)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Delivery Charges</span>
                    <span className={shipping === 0 ? 'font-medium text-green-600' : ''}>
                        {shipping === 0 ? 'FREE' : formatCurrency(shipping, settings)}
                    </span>
                </div>
                {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>Coupon Discount</span>
                        <span>- {formatCurrency(discount, settings)}</span>
                    </div>
                )}
                <div className="my-1 border-t border-slate-200" />
                <div className="flex justify-between text-base font-bold text-slate-800">
                    <span>Total Amount</span>
                    <span>{formatCurrency(total, settings)}</span>
                </div>
                {shipping === 0 && sub > 0 && (
                    <p className="text-xs font-medium text-green-600">🎉 Free delivery on this order!</p>
                )}
            </div>
        </div>
    );
};

const DeliveryAddress = ({ order }) => (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Delivery Address
        </h4>
        <div className="space-y-1 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
                {[order.firstName, order.lastName].filter(Boolean).join(' ')}
            </p>
            {order.address1 && <p>{order.address1}</p>}
            {order.address2 && <p>{order.address2}</p>}
            <p>{[order.city, order.state, order.postCode].filter(Boolean).join(', ')}</p>
            {order.country && <p>{order.country}</p>}
            {order.phone && (
                <p className="mt-2 flex items-center gap-1.5 text-slate-500">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {order.phone}
                </p>
            )}
        </div>
    </div>
);

const PaymentInfo = ({ order }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
        <svg className="h-5 w-5 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700">
                {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
            </span>
            <span className="text-slate-300">·</span>
            <Badge className={PAYMENT_BADGE[order.paymentStatus] || 'bg-slate-100 text-slate-600 ring-slate-200'}>
                {order.paymentStatus === 'paid'
                    ? '✓ Paid'
                    : order.paymentStatus === 'refunded'
                    ? '↩ Refunded'
                    : 'Unpaid'}
            </Badge>
            {order.transactionId && (
                <span className="text-xs text-slate-400">Ref: {order.transactionId.slice(-8).toUpperCase()}</span>
            )}
        </div>
    </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AccountOrders = () => {
    const { settings } = useSiteSettings();
    const [orders, setOrders]             = useState([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [error, setError]               = useState('');
    const [actionOrderId, setActionOrderId] = useState(null);
    const [message, setMessage]           = useState({ text: '', success: false });
    const [statusFilter, setStatusFilter] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS);
                setOrders(Array.isArray(data?.data?.orders) ? data.data.orders : data?.orders || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const filteredOrders = useMemo(() =>
        statusFilter ? orders.filter((o) => o.status === statusFilter) : orders,
    [orders, statusFilter]);

    const notify = (text, success = true) => {
        setMessage({ text, success });
        setTimeout(() => setMessage({ text: '', success: false }), 5000);
    };

    const handleReorder = async (orderId) => {
        try {
            setActionOrderId(orderId);
            const data = await apiClient.post(`${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/reorder`);
            const added   = data?.data?.addedItems?.length  || 0;
            const skipped = data?.data?.skippedItems?.length || 0;
            notify(`Reorder complete: ${added} item(s) added to cart${skipped ? `, ${skipped} skipped` : ''}.`);
        } catch (err) {
            notify(err.message, false);
        } finally {
            setActionOrderId(null);
        }
    };

    const handleReturnRequest = async (orderId) => {
        const reason = window.prompt('Please describe why you want to return this order (min 5 chars):');
        if (!reason || reason.trim().length < 5) {
            if (reason !== null) notify('Return reason must be at least 5 characters.', false);
            return;
        }
        try {
            setActionOrderId(orderId);
            await apiClient.post(`${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/returns`, {
                reason: reason.trim()
            });
            notify('Return request submitted successfully.');
        } catch (err) {
            notify(err.message, false);
        } finally {
            setActionOrderId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
                    <p className="text-sm text-slate-500">
                        {orders.length} order{orders.length !== 1 ? 's' : ''} total
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Orders</option>
                    <option value="new">New</option>
                    <option value="process">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Toast */}
            {message.text && (
                <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${
                    message.success
                        ? 'bg-green-50 text-green-700 ring-green-200'
                        : 'bg-red-50 text-red-700 ring-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            {/* Empty state */}
            {filteredOrders.length === 0 ? (
                <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                    <svg className="mx-auto mb-4 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="font-medium text-slate-500">
                        {statusFilter ? `No ${statusFilter} orders found.` : "You haven't placed any orders yet."}
                    </p>
                    <Link to="/products" className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const statusCfg  = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                        const isExpanded = expandedOrder === order._id;
                        const orderDate  = new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                        });

                        return (
                            <div key={order._id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">

                                {/* ── Amazon-style order header bar ── */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                                    <div className="flex flex-wrap gap-6">
                                        <div>
                                            <span className="block font-semibold uppercase tracking-wider text-slate-400">Order Placed</span>
                                            <span className="font-medium text-slate-700">{orderDate}</span>
                                        </div>
                                        <div>
                                            <span className="block font-semibold uppercase tracking-wider text-slate-400">Total</span>
                                            <span className="font-medium text-slate-700">{formatCurrency(order.totalAmount, settings)}</span>
                                        </div>
                                        <div>
                                            <span className="block font-semibold uppercase tracking-wider text-slate-400">Ship To</span>
                                            <span className="font-medium text-slate-700">
                                                {[order.firstName, order.lastName].filter(Boolean).join(' ') || '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-semibold uppercase tracking-wider text-slate-400">Order #</span>
                                        <span className="font-mono font-bold text-slate-700">
                                            {order.orderNumber || order._id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Status + toggle row ── */}
                                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className={`${statusCfg.badge} ring-1`}>
                                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                                            {statusCfg.label}
                                        </Badge>
                                        <Badge className={`${PAYMENT_BADGE[order.paymentStatus] || 'bg-slate-100 text-slate-600 ring-slate-200'} ring-1`}>
                                            {String(order.paymentStatus || '').charAt(0).toUpperCase() + String(order.paymentStatus || '').slice(1)}
                                        </Badge>
                                        <span className="text-sm text-slate-500">
                                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                Hide Details
                                            </>
                                        ) : (
                                            <>
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                View Details
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* ── Expanded Order Detail ── */}
                                {isExpanded && (
                                    <div className="space-y-6 border-t border-slate-100 px-5 pb-6 pt-5">

                                        {/* Tracking stepper */}
                                        <div>
                                            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">Order Tracking</p>
                                            <OrderTracker status={order.status} />
                                        </div>

                                        {/* Items */}
                                        {order.items?.length > 0 && (
                                            <div>
                                                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Items Ordered</p>
                                                <div className="divide-y divide-slate-100 rounded-2xl px-4 ring-1 ring-slate-100">
                                                    {order.items.map((item, idx) => (
                                                        <ItemRow key={item._id || idx} item={item} orderId={order._id} canReview={order.status === 'delivered'} settings={settings} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Address + Price summary side by side */}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <DeliveryAddress order={order} />
                                            <PriceSummary order={order} settings={settings} />
                                        </div>

                                        {/* Payment info */}
                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Payment</p>
                                            <PaymentInfo order={order} />
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                                            <button
                                                onClick={() => handleReorder(order._id)}
                                                disabled={!!actionOrderId}
                                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {actionOrderId === order._id ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        Processing...
                                                    </span>
                                                ) : '↺ Reorder'}
                                            </button>

                                            {order.status === 'delivered' && (
                                                <button
                                                    onClick={() => handleReturnRequest(order._id)}
                                                    disabled={!!actionOrderId}
                                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Return / Refund
                                                </button>
                                            )}

                                            <Link
                                                to="/account/returns"
                                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                            >
                                                View Returns
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AccountOrders;

