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
        const reviewLink = `/leave-review?leaseId=${lease._id}&tenantId=${lease.tenantId}&landlordId=${lease.landlordId}`;

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
          link: reviewLink, // Optional: helps tenants navigate directly
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
          link: reviewLink,
          isRead: false,
        });

        io.to(lease.tenantId.toString()).emit("newNotification", tenantNotification);
        io.to(lease.landlordId.toString()).emit("newNotification", landlordNotification);

        lease.status = "expired";
        await lease.save();

        console.log("✅ Lease expired, notifications sent for lease:", lease._id);
      }

      console.log("[CRON] Lease expiry check complete.");
    } catch (error) {
      console.error("[CRON] Error in lease expiry job:", error);
    }
  });
}

module.exports = { startLeaseExpiryJob };
