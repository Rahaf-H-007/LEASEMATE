const cron = require("node-cron");
const Lease = require("../models/lease.model");
const Notification = require("../models/notification.model");

function startLeaseExpiryJob(io) {
  cron.schedule("* * * * *", async () => {
    console.log("[CRON] Checking expired leases...");

    try {
      const now = new Date();

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
        // إعادة الوحدة إلى متاحة إذا انتهى العقد
        const Unit = require("../models/unit.model");
        await Unit.findByIdAndUpdate(lease.unitId, { status: "available" });

        console.log("✅ Lease expired, notifications sent for lease:", lease._id);
      }

      console.log("[CRON] Lease expiry check complete.");
    } catch (error) {
      console.error("[CRON] Error in lease expiry job:", error);
    }
  });
}

module.exports = { startLeaseExpiryJob };
