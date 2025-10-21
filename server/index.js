const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// ensure .env file is loaded from correct path
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initializeDatabase } = require('./config/initDatabase');
const { initTranslations } = require('./config/i18n');

// Import interest scheduler
const interestScheduler = require('./services/InterestScheduler');
// Import exchange rate scheduler
const exchangeRateScheduler = require('./services/ExchangeRateScheduler');

const app = express();

// Debug environment variables
console.log('Environment variable debugging:');
console.log('process.env.PORT:', process.env.PORT);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

const PORT = process.env.PORT || 3200;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3100',
    'http://127.0.0.1:3100',
    'http://192.168.0.197:3100',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wallet API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Database status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const { getDatabaseStats } = require('./config/initDatabase');
    const stats = await getDatabaseStats();
    res.json({ 
      status: 'OK', 
      database: 'SQLite',
      stats,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error fetching database status:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// API routes will be added here
app.use('/api/wallets', require('./routes/wallets'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/interests', require('./routes/interests'));
app.use('/api/exchange-rates', require('./routes/exchangeRates'));
app.use('/api/third-party', require('./routes/thirdPartyPayments'));
app.use('/api/cdks', require('./routes/cdks'));

const { t } = require('./config/i18n');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: t(req, 'errors.serverError'),
    message: process.env.NODE_ENV === 'development' ? err.message : t(req, 'errors.serverError')
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: t(req, 'errors.routeNotFound') });
});

// Initialize database and start server
async function startServer() {
    try {
      console.log('Initializing database...');
      const dbInitialized = await initializeDatabase();
      
      // Initialize translations
      await initTranslations();
      
      if (!dbInitialized) {
        console.error('Database initialization failed, server startup aborted');
        process.exit(1);
      }
      
      app.listen(PORT, '0.0.0.0', async () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Local access: http://localhost:${PORT}/api/health`);
        console.log(`LAN access: http://0.0.0.0:${PORT}/api/health`);
        console.log(`Database status: http://localhost:${PORT}/api/status`);
        
        // Start interest scheduler
        try {
          const schedulerResult = await interestScheduler.start();
          if (!schedulerResult.success) {
            console.warn('Interest scheduler startup failed, but server continues running');
          }
        } catch (error) {
          console.error('Error starting interest scheduler:', error);
          console.warn('Interest scheduler cannot start, but server continues running');
        }
        
        // Start exchange rate scheduler
        try {
          const rateSchedulerResult = await exchangeRateScheduler.start();
          if (!rateSchedulerResult.success) {
            console.warn('Exchange rate scheduler startup failed, but server continues running');
          }
        } catch (error) {
          console.error('Error starting exchange rate scheduler:', error);
          console.warn('Exchange rate scheduler cannot start, but server continues running');
        }
      });
    } catch (error) {
      console.error('Server startup failed:', error.message);
      process.exit(1);
    }
  }

startServer();