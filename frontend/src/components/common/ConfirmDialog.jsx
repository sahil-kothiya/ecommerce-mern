import React from 'react';

const ConfirmDialog = ({
    isOpen,
    title = 'Confirm Action',
    message = 'Please confirm to continue.',
    highlightText = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isProcessing = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => !isProcessing && onCancel?.()}
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-2xl">
                <div className="relative bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 px-6 py-6 text-white">
                    <div className="absolute -top-12 -right-10 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                    <p className="text-xs uppercase tracking-[0.18em] text-white/80">Confirmation</p>
                    <h3 className="mt-2 text-2xl font-black">{title}</h3>
                    <p className="mt-1 text-sm text-white/90">{message}</p>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {highlightText ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-xs uppercase tracking-widest text-rose-600">Selected Item</p>
                            <p className="mt-1 break-words text-lg font-extrabold text-rose-900">{highlightText}</p>
                        </div>
                    ) : null}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={onCancel}
                            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={onConfirm}
                            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 font-bold text-white hover:bg-rose-500 disabled:opacity-60"
                        >
                            {isProcessing ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
