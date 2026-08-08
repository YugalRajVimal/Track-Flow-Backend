const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const channelPartnerRoutes = require('./routes/channelPartner.routes');
const brandRoutes = require('./routes/brand.routes');
const awbRoutes = require('./routes/awb.routes');
const returnRoutes = require('./routes/return.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const exportRoutes = require('./routes/export.routes');
const offlineRoutes = require('./routes/offline.routes');
const offlineDataRoutes = require('./routes/offlineData.routes');
const taskDataRoutes = require('./routes/taskData.routes');
const taskRoutes = require('./routes/task.routes');
const submissionPaymentDataRoutes = require('./routes/submissionPaymentData.routes');
const paymentRecordRoutes = require('./routes/paymentRecord.routes');
const paymentDataRoutes = require('./routes/paymentData.routes');
const colorChemicalRoutes = require('./routes/colorChemical.routes');
const colorChemicalDataRoutes = require('./routes/colorChemicalDataRoutes'); // <-- ADDED

// Printing-specific routes
const printingTaskRoutes = require('./routes/printing/printingTask.routes');

const printingSubmissionPaymentDataRoutes = require('./routes/printing/printingSubmissionPaymentData.routes');
const printingTaskDataRoutes = require('./routes/printing/printingTaskData.routes');
const printingPaymentDataRoutes = require('./routes/printing/printingPaymentData.routes');
const printingColorChemicalDataRoutes = require('./routes/printing/printingColorChemicalDataRoutes');

const printingColorChemicalRoutes = require('./routes/printing/printingColorChemical.routes');
const printingPaymentRecordRoutes = require('./routes/printing/printingPaymentRecord.routes');
const productionManagementDataRoutes = require('./routes/productionManagement/productionManagementData.routes');
const styleAverageDataRoutes = require('./routes/productionManagement/styleAverage.routes');
const productionManagementRecordRoutes = require('./routes/productionManagement/productionManagementRecord.routes');






const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
//   max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: 'Too many requests, please try again later.',
//     errors: [],
//   },
// });

// app.use(limiter);

// Stricter rate limit for auth endpoints
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
//   message: {
//     success: false,
//     message: 'Too many login attempts, please try again after 15 minutes.',
//     errors: [],
//   },
// });

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AWB Tracking API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';
// Serve files in /uploads folder statically at /uploads

app.use(`${API_PREFIX}/uploads`, express.static(path.join(__dirname, 'uploads')));

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/channel-partners`, channelPartnerRoutes);
app.use(`${API_PREFIX}/brands`, brandRoutes);
app.use(`${API_PREFIX}/awb`, awbRoutes);
app.use(`${API_PREFIX}/returns`, returnRoutes);

app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/audit-logs`, auditLogRoutes);
app.use(`${API_PREFIX}/export`, exportRoutes);
app.use(`${API_PREFIX}/offline`, offlineRoutes);
app.use(`${API_PREFIX}/offline-data`, offlineDataRoutes);

app.use(`${API_PREFIX}/tasks`, taskRoutes);
// Add new colorChemical routes
app.use(`${API_PREFIX}/color-chemicals`, colorChemicalRoutes);
// Add new paymentRecord routes
app.use(`${API_PREFIX}/payment-records`, paymentRecordRoutes);

// Add new submissionPaymentData routes
app.use(`${API_PREFIX}/submission-payment-data`, submissionPaymentDataRoutes);

app.use(`${API_PREFIX}/task-data`, taskDataRoutes);
// Add new paymentData routes
app.use(`${API_PREFIX}/payment-data`, paymentDataRoutes);
// Add new colorChemicalData routes
app.use(`${API_PREFIX}/color-chemical-data`, colorChemicalDataRoutes);

app.use(`${API_PREFIX}/printing/tasks`, printingTaskRoutes);

// Add new submissionPaymentData routes
app.use(`${API_PREFIX}/printing/submission-payment-data`, printingSubmissionPaymentDataRoutes);

app.use(`${API_PREFIX}/printing/task-data`, printingTaskDataRoutes);
// Add new paymentData routes
app.use(`${API_PREFIX}/printing/payment-data`, printingPaymentDataRoutes);
// Add new colorChemicalData routes
app.use(`${API_PREFIX}/printing/color-chemical-data`, printingColorChemicalDataRoutes);

app.use(`${API_PREFIX}/printing/color-chemicals`, printingColorChemicalRoutes);

app.use(`${API_PREFIX}/printing/payment-records`, printingPaymentRecordRoutes);

// Production Management Data routes

app.use(`${API_PREFIX}/production-management-data`, productionManagementDataRoutes);
app.use(`${API_PREFIX}/style-average`,styleAverageDataRoutes );
// Add new productionManagementRecord routes
app.use(`${API_PREFIX}/production-management-record`, productionManagementRecordRoutes);




// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
