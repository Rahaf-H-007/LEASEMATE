const express = require('express');
const Lease = require('../models/lease.model');

const router = express.Router();

router.post('/test-leases', async (req, res) => {
  try {
    const { landlordId, tenantId } = req.body;

    const lease = await Lease.create({
      landlordId,
      tenantId,
      unitId: null,            // fill in if you have units
      startDate: new Date(),   // dummy values
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // +1 year
      rentAmount: 1000,
      status: 'active'
    });

    res.status(201).json(lease);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create test lease' });
  }
});

module.exports = router;
