const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const server = app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use.`);
        console.error(`Run this to free it: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      } else {
        console.error('Server error:', err);
      }
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
