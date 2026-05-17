const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    studentId: {
        type: String,
        required: true,
        ref: 'Student'
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfPayment: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash', 'Bank', 'Mobile Money', 'Credit Card', 'Check'],
        default: 'Cash'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);