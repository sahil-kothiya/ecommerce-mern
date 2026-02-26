import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

export default SearchableSelect;
