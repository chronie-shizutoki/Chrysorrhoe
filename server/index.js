const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// ensure .env file is loaded from correct path
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initializeDatabase } = require('./config/initDatabase');

// Chrysorrhoe: Import interest scheduler
const interestScheduler = require('./services/InterestScheduler');
// Chrysorrhoe: Import exchange rate scheduler
const exchangeRateScheduler = require('./services/ExchangeRateScheduler');

const app = express();

// Chrysorrhoe: Debug environment variables
console.log('Chrysorrhoe: Environment variable debugging:');
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
    console.error('Chrysorrhoe: Error fetching database status:', error);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Chrysorrhoe: Initialize database and start server
async function startServer() {
  try {
    console.log('Chrysorrhoe: Initializing database...');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('Chrysorrhoe: Database initialization failed, server startup aborted');
      process.exit(1);
    }
    
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`Chrysorrhoe: Server running on port ${PORT}`);
      console.log(`Chrysorrhoe: Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Chrysorrhoe: Local access: http://localhost:${PORT}/api/health`);
      console.log(`Chrysorrhoe: LAN access: http://0.0.0.0:${PORT}/api/health`);
      console.log(`Chrysorrhoe: Database status: http://localhost:${PORT}/api/status`);
      
      // Chrysorrhoe: Start interest scheduler
      try {
        const schedulerResult = await interestScheduler.start();
        if (!schedulerResult.success) {
          console.warn('Chrysorrhoe: Interest scheduler startup failed, but server continues running');
        }
      } catch (error) {
        console.error('Chrysorrhoe: Error starting interest scheduler:', error);
        console.warn('Chrysorrhoe: Interest scheduler cannot start, but server continues running');
      }
      
      // Chrysorrhoe: Start exchange rate scheduler
      try {
        const rateSchedulerResult = await exchangeRateScheduler.start();
        if (!rateSchedulerResult.success) {
          console.warn('Chrysorrhoe: Exchange rate scheduler startup failed, but server continues running');
        }
      } catch (error) {
        console.error('Chrysorrhoe: Error starting exchange rate scheduler:', error);
        console.warn('Chrysorrhoe: Exchange rate scheduler cannot start, but server continues running');
      }
    });
  } catch (error) {
    console.error('Chrysorrhoe: Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();