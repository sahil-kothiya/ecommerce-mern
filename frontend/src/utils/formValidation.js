export const getFieldBorderClass = (errors, field, valid = 'border-slate-300', invalid = 'border-red-500') => (
    errors?.[field] ? invalid : valid
);

export const clearFieldError = (setErrors, field) => {
    setErrors((prev) => {
        if (!prev?.[field]) return prev;
        return { ...prev, [field]: null };
    });
};

export const mapServerFieldErrors = (errorsArray, base = {}) => {
    const mapped = { ...base };
    if (!Array.isArray(errorsArray)) return mapped;

    errorsArray.forEach((item) => {
        if (!item) return;
        const field = item.field || item.path || item.param;
        const message = item.message || item.msg;
        if (field && message) mapped[field] = message;
    });

    return mapped;
};

export const hasValidationErrors = (errors = {}) => (
    Object.values(errors || {}).some((value) => Boolean(value))
);

export const getValidationMessages = (errors = {}) => (
    [...new Set(
        Object.values(errors || {})
            .filter((value) => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
    )]
);

export const applyServerFieldErrors = (setErrors, errorsArray, base = {}) => {
    const mapped = mapServerFieldErrors(errorsArray, base);
    if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
    }
    return mapped;
};
