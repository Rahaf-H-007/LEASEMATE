const checkVerification = (req, res, next) => {
  // Check if user status is 'approved'
  if (
    !req.user.verificationStatus ||
    req.user.verificationStatus.status !== "approved"
  ) {
    return res.status(403).json({
      message:
        "Access denied. Only verified landlords can perform this action.",
      status: "FAIL",
    });
  }
  next();
};

module.exports = { checkVerification };