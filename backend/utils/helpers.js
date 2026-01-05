// Centralized error response format
export const sendError = (res, statusCode, message, details = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };
    
    if (details) {
        response.details = details;
    }
    
    return res.status(statusCode).json(response);
};

export const sendSuccess = (res, data, message = null, statusCode = 200) => {
    const response = {
        success: true,
        ...data
    };
    
    if (message) {
        response.message = message;
    }
    
    return res.status(statusCode).json(response);
};

// Validation helpers
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    return password && password.length >= 6;
};

export const validateRequired = (fields, body) => {
    const missing = [];
    fields.forEach(field => {
        if (!body[field]) {
            missing.push(field);
        }
    });
    return missing.length > 0 ? missing : null;
};

export const sanitizeString = (str, maxLength = 255) => {
    if (!str) return '';
    return String(str).trim().slice(0, maxLength);
};

export const validateNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
