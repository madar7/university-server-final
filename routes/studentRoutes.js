const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/', studentController.createStudent);
router.get('/', studentController.getAllStudents);
router.get('/:studentId', studentController.getStudent);
router.put('/:studentId', studentController.updateStudent);
router.delete('/:studentId', studentController.deleteStudent);

module.exports = router;