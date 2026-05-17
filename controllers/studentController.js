const Student = require('../models/Student');
const Payment = require('../models/Payment');

const studentController = {
    // Create student
    async createStudent(req, res) {
        try {
            const { studentId, firstName, lastName, email, course, yearOfStudy } = req.body;
            
            const existing = await Student.findOne({ 
                $or: [{ studentId }, { email }] 
            });
            
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Student with this ID or email already exists'
                });
            }
            
            const student = new Student({
                studentId,
                firstName,
                lastName,
                email,
                course,
                yearOfStudy,
                feesCollected: 0
            });
            
            await student.save();
            
            res.status(201).json({
                success: true,
                message: 'Student created successfully',
                data: student
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Get all students
    async getAllStudents(req, res) {
        try {
            const students = await Student.find().sort({ createdAt: -1 });
            res.json({
                success: true,
                count: students.length,
                data: students
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Get single student
    async getStudent(req, res) {
        try {
            const student = await Student.findOne({ 
                studentId: req.params.studentId 
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }
            
            res.json({
                success: true,
                data: student
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Update student
    async updateStudent(req, res) {
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
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Student updated successfully',
                data: student
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // Delete student
    async deleteStudent(req, res) {
        try {
            const student = await Student.findOneAndDelete({ 
                studentId: req.params.studentId 
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }
            
            await Payment.deleteMany({ studentId: student.studentId });
            
            res.json({
                success: true,
                message: 'Student deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = studentController;