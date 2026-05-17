require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// ============ MONGODB CONNECTION ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university_db';

// Connection options for better stability
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
};

mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        console.log(`🎯 Connection State: ${mongoose.connection.readyState}`);
    })
    .catch((error) => {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️ Running with in-memory storage');
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// ============ SCHEMAS ============
const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    course: { type: String, required: true },
    yearOfStudy: { type: Number, required: true, min: 1, max: 6 },
    feesCollected: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
    paymentId: { type: String, required: true, unique: true },
    studentId: { type: String, required: true, ref: 'Student' },
    studentName: { type: String, required: true },
    dateOfPayment: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, enum: ['Cash', 'Bank', 'Mobile Money', 'Credit Card', 'Check'] }
});

// Create Models (check if models exist to prevent overwriting)
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

// ============ STUDENT ROUTES ============

// Create Student
app.post('/api/students', async (req, res) => {
    try {
        const { studentId, firstName, lastName, email, course, yearOfStudy } = req.body;
        
        // Validation
        if (!studentId || !firstName || !lastName || !email || !course || !yearOfStudy) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        // Check if student already exists
        const existing = await Student.findOne({ $or: [{ studentId }, { email }] });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Student ID or Email already exists' });
        }
        
        const student = new Student({
            studentId,
            firstName,
            lastName,
            email,
            course,
            yearOfStudy: parseInt(yearOfStudy),
            feesCollected: 0
        });
        
        await student.save();
        res.status(201).json({ success: true, message: 'Student added successfully!', data: student });
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get All Students
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        res.json({ success: true, count: students.length, data: students });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Single Student
app.get('/api/students/:studentId', async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.params.studentId });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: student });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Student
app.put('/api/students/:studentId', async (req, res) => {
    try {
        if (req.body.feesCollected !== undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update feesCollected directly. Use payment endpoints.' 
            });
        }
        
        const student = await Student.findOneAndUpdate(
            { studentId: req.params.studentId },
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: student });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete Student
app.delete('/api/students/:studentId', async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({ studentId: req.params.studentId });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        
        await Payment.deleteMany({ studentId: student.studentId });
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ PAYMENT ROUTES ============

// Create Payment (Auto-updates fees)
app.post('/api/payments', async (req, res) => {
    try {
        const { paymentId, studentId, amount, paymentMethod } = req.body;
        
        // Validation
        if (!paymentId || !studentId || !amount || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const student = await Student.findOne({ studentId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }
        
        const existingPayment = await Payment.findOne({ paymentId });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: 'Payment ID already exists' });
        }
        
        const payment = new Payment({
            paymentId,
            studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            amount,
            paymentMethod
        });
        
        await payment.save();
        
        // Update student's fees
        student.feesCollected += amount;
        await student.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Payment recorded successfully',
            data: { payment, updatedFeesCollected: student.feesCollected }
        });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get All Payments
app.get('/api/payments', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ dateOfPayment: -1 });
        res.json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Payments by Student
app.get('/api/payments/student/:studentId', async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.params.studentId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        const payments = await Payment.find({ studentId: req.params.studentId });
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
        console.error('Get student payments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete Payment (Auto-adjusts fees)
app.delete('/api/payments/:paymentId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        const student = await Student.findOne({ studentId: payment.studentId });
        if (student) {
            student.feesCollected -= payment.amount;
            if (student.feesCollected < 0) student.feesCollected = 0;
            await student.save();
        }
        
        await Payment.deleteOne({ paymentId: req.params.paymentId });
        
        res.json({ success: true, message: 'Payment deleted and fees adjusted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ STATISTICS ROUTES ============

// Get Statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalPayments = await Payment.countDocuments();
        const payments = await Payment.find();
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Get recent activity
        const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(5);
        const recentPayments = await Payment.find().sort({ dateOfPayment: -1 }).limit(5);
        
        res.json({
            success: true,
            data: {
                totalStudents,
                totalPayments,
                totalRevenue,
                averagePayment: totalPayments > 0 ? totalRevenue / totalPayments : 0,
                recentStudents,
                recentPayments
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ DASHBOARD & UI ROUTES ============

// Serve the main dashboard HTML
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve the main index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API Info Route
app.get('/api/info', (req, res) => {
    res.json({
        name: 'University Management System API',
        version: '2.0.0',
        status: 'running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString(),
        endpoints: {
            students: {
                list: 'GET /api/students',
                create: 'POST /api/students',
                get: 'GET /api/students/:studentId',
                update: 'PUT /api/students/:studentId',
                delete: 'DELETE /api/students/:studentId'
            },
            payments: {
                list: 'GET /api/payments',
                create: 'POST /api/payments',
                getByStudent: 'GET /api/payments/student/:studentId',
                delete: 'DELETE /api/payments/:paymentId'
            },
            statistics: 'GET /api/stats'
        }
    });
});

// ============ ERROR HANDLING ============

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.url} not found`,
        availableEndpoints: {
            students: '/api/students',
            payments: '/api/payments',
            stats: '/api/stats',
            dashboard: '/dashboard',
            apiInfo: '/api/info'
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 UNIVERSITY MANAGEMENT SYSTEM');
    console.log('='.repeat(50));
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`📱 API available at http://localhost:${PORT}`);
    console.log(`🎨 Dashboard available at http://localhost:${PORT}/dashboard`);
    console.log(`📊 API Info at http://localhost:${PORT}/api/info`);
    console.log('-'.repeat(50));
    console.log(`✅ MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Waiting for connection...'}`);
    console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️ Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});