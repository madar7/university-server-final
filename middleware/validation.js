const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

const studentValidation = {
    create: [
        body('studentId').notEmpty().withMessage('Student ID required'),
        body('firstName').notEmpty().withMessage('First name required'),
        body('lastName').notEmpty().withMessage('Last name required'),
        body('email').isEmail().withMessage('Valid email required'),
        body('course').notEmpty().withMessage('Course required'),
        body('yearOfStudy').isInt({ min: 1, max: 6 }),
        validateRequest
    ]
};

const paymentValidation = {
    create: [
        body('paymentId').notEmpty().withMessage('Payment ID required'),
        body('studentId').notEmpty().withMessage('Student ID required'),
        body('amount').isFloat({ min: 0.01 }),
        body('paymentMethod').isIn(['Cash', 'Bank', 'Mobile Money', 'Credit Card', 'Check']),
        validateRequest
    ]
};

module.exports = { studentValidation, paymentValidation };