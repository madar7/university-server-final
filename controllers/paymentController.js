const Payment = require('../models/Payment');
const Student = require('../models/Student');

const paymentController = {
    // Create payment (auto-updates fees)
    async createPayment(req, res) {
        try {
            const { paymentId, studentId, amount, paymentMethod } = req.body;
            
            // Check if student exists
            const student = await Student.findOne({ studentId });
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }
            
            // Check if payment ID exists
            const existingPayment = await Payment.findOne({ paymentId });
            if (existingPayment) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment ID already exists'
                });
            }
            
            // Validate amount
            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be greater than 0'
                });
            }
            
            // Create payment
            const payment = new Payment({
                paymentId,
                studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                amount,
                paymentMethod
            });
            
            await payment.save();
            
            // Update student's fees
            const previousFees = student.feesCollected;
            student.feesCollected += amount;
            await student.save();
            
            res.status(201).json({
                success: true,
                message: 'Payment recorded successfully',
                data: {
                    payment,
                    previousFeesCollected: previousFees,
                    updatedFeesCollected: student.feesCollected
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Get all payments
    async getAllPayments(req, res) {
        try {
            const payments = await Payment.find().sort({ dateOfPayment: -1 });
            res.json({
                success: true,
                count: payments.length,
                data: payments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Get payments by student
    async getPaymentsByStudent(req, res) {
        try {
            const { studentId } = req.params;
            
            const student = await Student.findOne({ studentId });
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }
            
            const payments = await Payment.find({ studentId });
            
            res.json({
                success: true,
                student: {
                    id: student.studentId,
                    name: `${student.firstName} ${student.lastName}`,
                    totalFeesCollected: student.feesCollected
                },
                count: payments.length,
                data: payments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Delete payment (adjusts fees)
    async deletePayment(req, res) {
        try {
            const { paymentId } = req.params;
            
            const payment = await Payment.findOne({ paymentId });
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }
            
            const student = await Student.findOne({ studentId: payment.studentId });
            if (student) {
                student.feesCollected -= payment.amount;
                if (student.feesCollected < 0) student.feesCollected = 0;
                await student.save();
            }
            
            await Payment.deleteOne({ paymentId });
            
            res.json({
                success: true,
                message: 'Payment deleted and fees adjusted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = paymentController;