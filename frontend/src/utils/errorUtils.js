import { logger } from "./logger.js";

export const processApiError = (error) => {
  const result = {
    fieldErrors: {},
    errorMessages: [],
    generalError: "An error occurred. Please try again.",
  };

  logger.debug("Processing API error:", error?.message);

  if (error.response?.data) {
    const responseData = error.response.data;

    if (responseData.errors && Array.isArray(responseData.errors)) {
      responseData.errors.forEach((errorItem) => {
        if (errorItem.field && errorItem.message) {
          result.fieldErrors[errorItem.field] = errorItem.message;
          result.errorMessages.push(errorItem.message);
        } else if (errorItem.msg) {
          const field = errorItem.path || errorItem.param || "unknown";
          result.fieldErrors[field] = errorItem.msg;
          result.errorMessages.push(errorItem.msg);
        } else if (typeof errorItem === "string") {
          result.errorMessages.push(errorItem);
        }
      });
    }

    if (responseData.message && responseData.message !== "Validation failed") {
      result.generalError = responseData.message;
    } else if (result.errorMessages.length > 0) {
      result.generalError = "";
    }
  } else if (error.message && !error.message.includes("Request failed")) {
    result.generalError = error.message;
  }

  return result;
};

export const getFieldClasses = (errors, serverErrors, fieldName) => {
  const base =
    "w-full px-4 py-3 border rounded-lg outline-none transition-colors focus:ring-2";
  const error =
    "border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-100 placeholder-red-300";
  const valid =
    "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-100";

  const hasError = errors[fieldName] || serverErrors[fieldName];
  return `${base} ${hasError ? error : valid}`;
};

export const getFieldError = (errors, serverErrors, fieldName) => {
  return errors[fieldName]?.message || serverErrors[fieldName] || null;
};

export const hasFieldError = (errors, serverErrors, fieldName) => {
  return !!(errors[fieldName] || serverErrors[fieldName]);
};
