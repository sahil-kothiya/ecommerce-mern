import React from "react";

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

export default AddressPicker;
