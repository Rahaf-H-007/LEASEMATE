const stripe = require('../config/stripe');
const User = require('../models/user.model');
const plans = require('../config/plans');
const Subscription = require('../models/subscription.model');
const Notification = require('../models/notification.model');
const Unit = require('../models/unit.model');

// Create Checkout Session for Subscription
exports.createCheckoutSession = async (req, res) => {
  try {
    const { planName } = req.body;
    const plan = plans[planName];
    if (!plan) return res.status(400).json({ message: 'Invalid plan selected' });

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let stripeCustomerId = user.stripeCustomerId;
    const customerEmail = user.email || (user.phone ? `${user.phone}@noemail.local` : undefined);

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: user.name,
        phone: user.phone,
        metadata: {
          userId: user._id.toString(),
          username: user.username,
          phone: user.phone,
        },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      customer: stripeCustomerId,
      success_url: `${process.env.CLIENT_URL}/dashboard/stripe/success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/stripe/cancel`,
      metadata: {
        userId: user._id.toString(),
        planName,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Session Error:', error.message);
    res.status(500).json({ message: 'Unable to create Stripe Checkout session' });
  }
};

// Stripe Webhook
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Stripe event:', event.type);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type } = event;

  if (type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;
    const subscriptionId = session.subscription;
    const plan = plans[planName];

    try {
      if (!userId || !subscriptionId || !plan) return;

      await Subscription.updateMany({ landlordId: userId, status: 'active' }, { status: 'expired' });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await Subscription.create({
        landlordId: userId,
        planName,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
        startDate,
        endDate,
        unitLimit: plan.unitLimit,
      });

      await User.findByIdAndUpdate(userId, {
        isSubscribed: true,
        subscriptionId,
        subscriptionPlan: planName,
        planUnitLimit: plan.unitLimit,
        planExpiresAt: endDate,
      });

      // Send Arabic notification to landlord
      const paymentNotif = await Notification.create({
        userId: userId,
        title: 'تم دفع الاشتراك',
        message: `لقد قمت بدفع مبلغ خطة الاشتراك (${plan.price} جنيه) لخطة (${plan.name}) بنجاح.`,
        type: 'PAYMENT_SUCCESS',
        isRead: false,
        createdAt: new Date(),
      });

      if (global.io) {
        global.io.to(userId).emit('newNotification', paymentNotif);
      }

      console.log(`✅ User ${userId} subscribed to ${planName}`);

      if (global.io) {
        global.io.to(userId).emit('subscriptionUpdated', { isSubscribed: true });
      }
    } catch (err) {
      console.error('Webhook subscription update failed:', err.message);
    }
  }

  if (type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    console.warn(`❌ Payment failed for customer: ${invoice.customer}, invoice: ${invoice.id}`);
    // Optional: notify or log this
  }

  res.status(200).send({ received: true });
};

// Refund Logic
// Refund Logic
exports.refundSpecificSubscription = async (req, res) => {
  const { subscriptionId } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });

  try {
    console.log("Refund API Called by:", req.user.id);
    console.log("Requested Subscription ID:", subscriptionId);

    const testSub = await Subscription.findById(subscriptionId);
    console.log("Subscription Raw Record:", testSub);

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      landlordId: user._id,
      refunded: false,
    });

    if (!subscription) {
      return res.status(400).json({ msg: 'لا يوجد اشتراك صالح لهذا المستخدم.' });
    }

    const statusNormalized = subscription.status?.trim().toLowerCase();
    console.log("Subscription Status:", subscription.status);
    if (statusNormalized !== 'expired') {
      return res.status(400).json({ msg: 'الاشتراك يجب أن يكون منتهي الصلاحية.' });
    }

    console.log("Already Refunded?", subscription.refunded);
    console.log("Stripe Subscription ID:", subscription.stripeSubscriptionId);

    const bookedUnits = await Unit.find({
      landlordId: user._id,
      subscriptionId: subscription._id,
      isBooked: true,
    });
    console.log("Booked Units:", bookedUnits);

    if (bookedUnits.length > 0) {
      return res.status(400).json({ msg: 'لا يمكن استرداد الاشتراك إذا كانت هناك وحدات محجوزة.' });
    }

    // === Stripe operations ===
    let stripeSub;
    try {
      stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      console.log("✅ Retrieved Stripe Subscription:", stripeSub?.id);
    } catch (err) {
      console.error("❌ Failed to retrieve Stripe subscription:", err);
      return res.status(500).json({ msg: 'فشل في جلب الاشتراك من Stripe.' });
    }

    if (!stripeSub.latest_invoice) {
      console.log("❌ No latest_invoice in subscription");
      return res.status(400).json({ msg: 'لا يوجد فاتورة دفع لهذا الاشتراك.' });
    }

    let invoice;
    try {
      invoice = await stripe.invoices.retrieve(stripeSub.latest_invoice);
      console.log("✅ Retrieved Invoice:", invoice?.id);
    } catch (err) {
      console.error("❌ Failed to retrieve invoice:", err);
      return res.status(500).json({ msg: 'فشل في جلب الفاتورة من Stripe.' });
    }

    if (!invoice.payment_intent) {
      console.log("❌ No payment_intent in invoice");
      return res.status(400).json({ msg: 'لا يوجد عملية دفع لهذا الاشتراك.' });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
      console.log("✅ Retrieved PaymentIntent:", paymentIntent?.id);
    } catch (err) {
      console.error("❌ Failed to retrieve payment intent:", err);
      return res.status(500).json({ msg: 'فشل في جلب عملية الدفع من Stripe.' });
    }

    let refund;
    try {
      refund = await stripe.refunds.create({ payment_intent: paymentIntent.id });
      console.log("✅ Refund created:", refund?.id);
    } catch (err) {
      console.error("❌ Failed to create refund:", err);
      return res.status(500).json({ msg: 'فشل في تنفيذ عملية الاسترداد من Stripe.' });
    }

    // === Update DB ===
    subscription.status = 'refunded';
    subscription.refunded = true;
    await subscription.save();

    // Disable related refund notifications
    await Notification.updateMany({
      userId: user._id,
      type: 'REFUND_ELIGIBLE',
      'meta.subscriptionId': subscription._id,
      disabled: false,
    }, { disabled: true });

    console.log("✅ Subscription successfully refunded.");
    res.json({ success: true, msg: 'تم استرداد الاشتراك بنجاح.', refund });

  } catch (err) {
    console.error('❌ Unexpected Refund error:', err);
    res.status(500).json({ msg: 'حدث خطأ أثناء معالجة الاسترداد من Stripe.' });
  }
};


