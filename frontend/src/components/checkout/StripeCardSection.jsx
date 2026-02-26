import React from "react";
import { CardElement } from "@stripe/react-stripe-js";

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: { 
            fontSize: "15px", 
            color: "#1f1f1f", 
            fontFamily: "inherit", 
            "::placeholder": { color: "#adb5bd" } 
        },
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

export default StripeCardSection;
