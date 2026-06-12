const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection & Startup
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Auto-migrate legacy 'MIT' college references to 'SR University'
    try {
      const { User, Alumni, AdminPost } = require('./models');
      const [uRes, aRes, apRes] = await Promise.all([
        User.updateMany({ college: 'MIT' }, { college: 'SR University' }),
        Alumni.updateMany({ college: 'MIT' }, { college: 'SR University' }),
        AdminPost.updateMany({ college: 'MIT' }, { college: 'SR University' })
      ]);
      if (uRes.modifiedCount > 0 || aRes.modifiedCount > 0 || apRes.modifiedCount > 0) {
        console.log(`🔄 [Migration] Renamed legacy 'MIT' college to 'SR University': Users: ${uRes.modifiedCount}, Alumni: ${aRes.modifiedCount}, AdminPosts: ${apRes.modifiedCount}`);
      }
    } catch (migError) {
      console.error('❌ [Migration] Failed to run database college migration:', migError.message);
    }

    app.listen(PORT, () => {
      console.log(`📡 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failure:', err.message);
    process.exit(1);
  });
