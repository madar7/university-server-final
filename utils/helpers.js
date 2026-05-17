// Generate unique ID
const generateId = (prefix, counter) => {
    return `${prefix}${String(counter).padStart(3, '0')}`;
};

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(amount);
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

// Calculate total fees
const calculateTotalFees = (payments) => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
};

module.exports = {
    generateId,
    formatCurrency,
    isValidEmail,
    calculateTotalFees
};