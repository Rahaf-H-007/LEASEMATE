const cron = require("node-cron");
const Lease = require("../models/lease.model");
const Notification = require("../models/notification.model");
const Subscription = require("../models/subscription.model");
const Unit = require("../models/unit.model");

function startLeaseExpiryJob(io) {
  cron.schedule("* * * * *", async () => {
    console.log("[CRON] Checking expired leases ...");

    try {
      const now = new Date();

      // Lease expiry notifications (existing logic)
      const expiredLeases = await Lease.find({
        endDate: { $lte: now },
        status: { $ne: "expired" }
      });

      for (let lease of expiredLeases) {
// For tenant notification (tenant reviews landlord)
const tenantReviewLink = `/leave-review?leaseId=${lease._id}&revieweeId=${lease.landlordId}`;
// For landlord notification (landlord reviews tenant)
const landlordReviewLink = `/leave-review?leaseId=${lease._id}&revieweeId=${lease.tenantId}`;
        const tenantNotification = await Notification.create({
          userId: lease.tenantId,
          title: "لقد انتهي العقد",
          message: "لقد انتهي العقد . يمكنك تقييم المالك",
          type: "LEASE_EXPIRED",
          leaseId: lease._id,
          landlordId: lease.landlordId,
          tenantId: lease.tenantId,
          senderId: lease.landlordId,
          isRead: false,
          link: tenantReviewLink,
        });

        const landlordNotification = await Notification.create({
          userId: lease.landlordId,
          title: "لقد انتهي العقد",
          message: "لقد انتهي العقد . يمكنك تقييم المستاجر",
          type: "LEASE_EXPIRED",
          leaseId: lease._id,
          landlordId: lease.landlordId,
          tenantId: lease.tenantId,
          senderId: lease.tenantId,
          isRead: false,
          link: landlordReviewLink,
        });

        console.log('📡 Emitting newNotification to tenant:', lease.tenantId.toString());
        // Populate senderId before emitting
        const populatedTenantNotification = await tenantNotification.populate('senderId', 'name avatarUrl');
        const populatedLandlordNotification = await landlordNotification.populate('senderId', 'name avatarUrl');
        io.to(lease.tenantId.toString()).emit("newNotification", populatedTenantNotification);
        io.to(lease.landlordId.toString()).emit("newNotification", populatedLandlordNotification);
        console.log('✅ Lease expiry notifications emitted successfully');

        lease.status = "expired";
        await lease.save();

        console.log("✅ Lease expired, notifications sent for lease:", lease._id);
      }

      console.log("[CRON] Lease expiry  check complete.");
      // Always check refund eligibility after lease expiry logic
      await checkRefundEligibility(io);
    } catch (error) {
      console.error("[CRON] Error in lease expiry job:", error);
    }
  });
}

async function checkRefundEligibility(io) {
  console.log('[CRON] Running checkRefundEligibility...');
  const now = new Date();
  const expiredSubs = await Subscription.find({ endDate: { $lt: now }, refunded: false });
  console.log('[CRON] Found expired subscriptions:', expiredSubs.length);

  for (const sub of expiredSubs) {
    console.log('[CRON] Checking subscription:', sub._id);
    const units = await Unit.find({ subscriptionId: sub._id });
    console.log('[CRON] Units for subscription:', units.length);
    const anyBooked = units.some(unit => unit.status === 'booked');
    if (!anyBooked) {
      // Send notification if not already sent
      const existing = await Notification.findOne({
        userId: sub.landlordId,
        type: 'REFUND_ELIGIBLE',
        'meta.subscriptionId': sub._id,
        disabled: false
      });
      if (!existing) {
        console.log('[CRON] Sending refund eligible notification for sub:', sub._id);
        const notif = await Notification.create({
          userId: sub.landlordId,
          type: 'REFUND_ELIGIBLE',
          message: `يمكنك استرداد قيمة الاشتراك رقم ${sub._id} .في حاله الرغبه في الاستردار اضغط هنا للتواصل مع الدعم`,
          meta: { subscriptionId: sub._id },
          disabled: false,
          title: 'استرداد الاشتراك',
          link: `/dashboard/support-chat`,
        });
        if (io) io.to(sub.landlordId.toString()).emit('newNotification', notif);
      } else {
        console.log('[CRON] Notification already exists for sub:', sub._id);
      }
    } else {
      console.log('[CRON] Some units are booked for sub:', sub._id);
    }
  }
  console.log('[CRON] checkRefundEligibility complete.');
}

module.exports = { startLeaseExpiryJob, checkRefundEligibility };
