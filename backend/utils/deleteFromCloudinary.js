const cloudinary = require('../config/cloudinary');

const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: "image" }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

module.exports = deleteFromCloudinary;