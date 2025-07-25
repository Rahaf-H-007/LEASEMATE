const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/create-checkout-session', protect, stripeController.createCheckoutSession);
router.post('/webhook', stripeController.handleWebhook);
// router.post('/refund', protect, stripeController.refundSubscription);
router.post('/refund-specific', protect, stripeController.refundSpecificSubscription);

module.exports = router;
