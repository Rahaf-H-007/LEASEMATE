const extractPublicId = (url) => {
  const matches = url.match(/\/(?:v\d+\/)?(.+)\.(jpg|jpeg|png|webp|gif)/i);
  return matches ? matches[1] : null; // e.g., LeaseMate/units/abc123 ???
};

module.exports = extractPublicId;