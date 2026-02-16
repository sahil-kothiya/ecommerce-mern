import { toast } from 'react-hot-toast';

export const getApiErrorMessage = (errorData, fallback = 'Something went wrong') => {
    if (!errorData) return fallback;
    if (typeof errorData === 'string') return errorData;
    if (typeof errorData.message === 'string' && errorData.message.trim()) return errorData.message;
    if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];
        if (typeof firstError === 'string') return firstError;
        if (firstError?.message) return firstError.message;
        if (firstError?.msg) return firstError.msg;
    }
    return fallback;
};

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
    if (error.response?.data) return getApiErrorMessage(error.response.data, fallback);
    if (error.data) return getApiErrorMessage(error.data, fallback);
    return fallback;
};

export const notify = {
    success: (message) => toast.success(message),
    error: (errorOrMessage, fallback) => toast.error(getErrorMessage(errorOrMessage, fallback)),
    info: (message) => toast(message),
};

export default notify;
