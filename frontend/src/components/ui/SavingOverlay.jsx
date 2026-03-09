import React from 'react';

const SavingOverlay = ({ visible, message = 'Saving...', subMessage = 'Please do not close this page.', progress = null }) => {
    if (!visible) return null;

    const hasProgress = progress && progress.total > 1;
    const pct = hasProgress ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="flex w-80 flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-2xl">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                <p className="text-center text-lg font-bold text-slate-800">{message}</p>
                {hasProgress && (
                    <div className="w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="mt-2 text-center text-xs text-slate-500">
                            {progress.current} / {progress.total} completed
                        </p>
                    </div>
                )}
                <p className="text-sm text-slate-500">{subMessage}</p>
            </div>
        </div>
    );
};

export default SavingOverlay;
