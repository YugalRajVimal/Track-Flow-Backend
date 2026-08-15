/**
 * Seed script — populates ChallanPlatformConfig from the paper forms you
 * shared (Label Station, Dispatch Station, Return Station).
 *
 * Usage:
 *   node seedChallanPlatformConfig.js
 *
 * Reads MONGODB_URI from your environment (same as the rest of the app).
 * Safe to re-run — each platform is upserted by name, so running it again
 * just updates the structure rather than creating duplicates.
 *
 * Place this file wherever you keep other one-off scripts (e.g. /scripts),
 * and adjust the require path to ChallanPlatformConfig below to match.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ChallanPlatformConfig = require('../src/models/production-management/challanManagement/ChallanPlatformConfig');

const BRANDS = ['Ammiy', 'K.R.', 'Rajasthan', 'Siya'];

// ── Platform definitions, straight from the three paper forms ──────────────
const PLATFORMS = [
  {
    name: 'Meesho',
    order: 1,
    // Label Station: Meesho is scanned brand-wise (Ammiy, K.R., Rajasthan, Siya)
    label: { rowType: 'brand', rows: BRANDS },
    // Dispatch Station: Meesho is scanned by Delivery Partner
    dispatch: { rowType: 'carrier', rows: ['Valmo', 'Delhivery', 'Shadowfax', 'Expressbess'] },
    // Return Station: brand rows × carrier columns
    return: {
      rowType: 'brand',
      rows: BRANDS,
      columns: ['Valmo', 'Delhivery', 'Shadowfax', 'Expressbess'],
    },
  },
  {
    name: 'Flipkart',
    order: 2,
    // Label Station: scanned by Company
    label: { rowType: 'brand', rows: BRANDS },
    // Dispatch Station: scanned by Company
    dispatch: { rowType: 'brand', rows: BRANDS },
    // Return Station: brand rows, only Ekart as carrier
    return: {
      rowType: 'brand',
      rows: BRANDS,
      columns: ['Ekart'],
    },
  },
  {
    name: 'Myntra',
    order: 3,
    // Label Station: scanned by Company
    label: { rowType: 'brand', rows: BRANDS },
    // Dispatch Station: scanned by Company
    dispatch: { rowType: 'brand', rows: BRANDS },
    // Return Station: brand rows, only Ekart as carrier
    return: {
      rowType: 'brand',
      rows: BRANDS,
      columns: ['Ekart'],
    },
  },
  {
    name: 'AL Website',
    order: 4,
    // Label Station: AL Website is scanned by Delivery Partner
    label: { rowType: 'carrier', rows: ['Delhivery', 'Shadowfax', 'Expressbees', 'Amazon', 'Ekart', 'Dtdc'] },
    // Dispatch Station: AL Website is scanned by Delivery Partner
    dispatch: { rowType: 'carrier', rows: ['Delhivery', 'Shadowfax', 'Expressbees', 'Amazon', 'Ekart', 'Dtdc'] },
    // Return Station: AL Website is NOT scanned per-brand — they scan all
    // returns as a single stream, so there's just one row.
    return: {
      rowType: 'carrier',
      rows: ['Amazon'],
      columns: ['Ekart', 'Delhivery', 'Shadowfax', 'Expressbees'],
    },
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in your environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  for (const platform of PLATFORMS) {
    const { name, order, label, dispatch, return: ret } = platform;
    const result = await ChallanPlatformConfig.findOneAndUpdate(
      { name },
      { $set: { name, active: true, order, label, dispatch, return: ret } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`✔ Upserted "${result.name}" (order ${result.order})`);
  }

  console.log('\nDone. Seeded platforms:', PLATFORMS.map((p) => p.name).join(', '));
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});