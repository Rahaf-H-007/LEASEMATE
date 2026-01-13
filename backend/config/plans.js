module.exports = {
  basic: {
    name: "أساسي",
    priceId: process.env.STRIPE_PRICE_BASIC,
    unitLimit: 1,
    price: 500, // USD or your currency
  },
  standard: {
    name: "قياسي",
    priceId: process.env.STRIPE_PRICE_STANDARD,
    unitLimit: 2,
    price: 900,
  },
  premium: {
    name: "مميز",
    priceId: process.env.STRIPE_PRICE_PREMIUM,
    unitLimit: 4,
    price: 1200,
  },
};
