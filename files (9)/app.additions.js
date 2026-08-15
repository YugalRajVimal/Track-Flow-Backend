// ─────────────────────────────────────────────────────────────────────────
// APP.JS ADDITIONS FOR CHALLAN ENTRY MANAGEMENT
// Add these in the same places as the fabricatorRateRoutes lines from the
// previous feature (i.e. this assumes that patch is already applied).
// ─────────────────────────────────────────────────────────────────────────

// 1) Add near the other route requires:
const challanPlatformConfigRoutes = require('./routes/challan/challanPlatformConfig.routes');
const challanEntryRoutes = require('./routes/challan/challanEntry.routes');

// 2) Add near the other app.use(...) mounts:
app.use(`${API_PREFIX}/challan/platform-config`, challanPlatformConfigRoutes);
app.use(`${API_PREFIX}/challan/entries`, challanEntryRoutes);
