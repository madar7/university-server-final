const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getAllPayments);
router.get('/student/:studentId', paymentController.getPaymentsByStudent);
router.delete('/:paymentId', paymentController.deletePayment);

module.exports = router;