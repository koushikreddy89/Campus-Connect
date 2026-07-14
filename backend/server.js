const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cookieParser());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:8081', 'http://127.0.0.1:8081',
        'http://localhost:8082', 'http://127.0.0.1:8082',
        'http://localhost:8088', 'http://127.0.0.1:8088'
      ],
  credentials: true
}));
app.use(express.json());

// Routes
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

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
    
    // Auto-seed college domains
    try {
      const { CollegeDomain } = require('./models');
      const domainCount = await CollegeDomain.countDocuments();
      if (domainCount === 0) {
        console.log('🌱 [Seeding] Seeding college domains from colleges.json...');
        const path = require('path');
        const fs = require('fs');
        const collegesJsonPath = path.join(__dirname, '../campus-connect-now/public/data/colleges.json');
        
        if (fs.existsSync(collegesJsonPath)) {
          const collegesData = JSON.parse(fs.readFileSync(collegesJsonPath, 'utf8'));
          if (collegesData && Array.isArray(collegesData.colleges)) {
            const recordsToInsert = collegesData.colleges.map(c => ({
              name: c.name,
              domain: c.domain.toLowerCase().trim()
            }));
            
            // Also ensure SR University is included!
            if (!recordsToInsert.some(r => r.domain === 'sru.edu.in')) {
              recordsToInsert.push({ name: 'SR University', domain: 'sru.edu.in' });
            }

            await CollegeDomain.insertMany(recordsToInsert, { ordered: false }).catch(() => {});
            console.log(`✅ [Seeding] Successfully seeded ${recordsToInsert.length} college domains`);
          }
        } else {
          console.warn('⚠️ [Seeding] colleges.json not found at:', collegesJsonPath);
        }
      }
    } catch (seedError) {
      console.error('❌ [Seeding] Failed to seed college domains:', seedError.message);
    }

    // Auto-migrate legacy 'MIT' college references and update placement types
    try {
      const { User, Alumni, AdminPost, Placement } = require('./models');
      const [uRes, aRes, apRes, pMigRes] = await Promise.all([
        User.updateMany({ college: 'MIT' }, { college: 'SR University' }),
        Alumni.updateMany({ college: 'MIT' }, { college: 'SR University' }),
        AdminPost.updateMany({ college: 'MIT' }, { college: 'SR University' }),
        Placement.updateMany({ college: 'MIT' }, { college: 'SR University' })
      ]);
      
      // Populate missing placementType and ensure fields are synced
      const unclassifiedPlacements = await Placement.find({ placementType: { $exists: false } });
      let updatedCount = 0;
      for (const p of unclassifiedPlacements) {
        p.placementType = p.createdByRole === 'ALUMNI' || p.createdByRole === 'Alumni' ? 'ALUMNI_REFERRAL' : 'OFFICIAL';
        await p.save();
        updatedCount++;
      }
      
      if (uRes.modifiedCount > 0 || aRes.modifiedCount > 0 || apRes.modifiedCount > 0 || pMigRes.modifiedCount > 0 || updatedCount > 0) {
        console.log(`🔄 [Migration] Renamed legacy 'MIT' college to 'SR University' & classified ${updatedCount} legacy placements.`);
      }
    } catch (migError) {
      console.error('❌ [Migration] Failed to run database college migration:', migError.message);
    }

    const http = require('http');
    const server = http.createServer(app);
    const { Server } = require('socket.io');
    const io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS 
          ? process.env.ALLOWED_ORIGINS.split(',') 
          : [
              'http://localhost:5173', 'http://127.0.0.1:5173',
              'http://localhost:3000', 'http://127.0.0.1:3000',
              'http://localhost:8081', 'http://127.0.0.1:8081',
              'http://localhost:8082', 'http://127.0.0.1:8082',
              'http://localhost:8088', 'http://127.0.0.1:8088'
            ],
        credentials: true
      }
    });
    globalThis.io = io;

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'campus-connect-super-secret';
    const { User, Alumni, Connection } = require('./models');

    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', async (socket) => {
      const userId = socket.user?.userId;
      const role = socket.user?.role;
      console.log('🔌 Socket connected:', socket.id, 'User:', userId);

      if (userId) {
        const Model = role === 'alumni' ? Alumni : User;
        await Model.findOneAndUpdate({ userId }, {
          $set: {
            isOnline: true,
            socketId: socket.id,
            lastActivity: new Date()
          }
        });

        const connections = await Connection.find({
          $or: [{ user1: userId }, { user2: userId }]
        });
        connections.forEach(conn => {
          socket.join(`match_${conn._id}`);
          socket.to(`match_${conn._id}`).emit('presence:status', {
            userId,
            isOnline: true,
            lastSeen: new Date()
          });
        });
      }

      socket.on('join_room', ({ roomId }) => {
        socket.join(roomId);
        console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);
      });

      socket.on('leave_room', ({ roomId }) => {
        socket.leave(roomId);
        console.log(`👤 Socket ${socket.id} left room: ${roomId}`);
      });

      socket.on('typing', ({ roomId, userId, isTyping }) => {
        socket.to(roomId).emit('typing', { roomId, userId, isTyping });
      });

      socket.on('presence', ({ roomId, userId, status, lastSeen }) => {
        socket.to(roomId).emit('presence', { roomId, userId, status, lastSeen });
      });

      socket.on('disconnect', async () => {
        console.log('🔌 Socket disconnected:', socket.id);
        if (userId) {
          const Model = role === 'alumni' ? Alumni : User;
          await Model.findOneAndUpdate({ userId }, {
            $set: {
              isOnline: false,
              socketId: null,
              lastSeen: new Date(),
              lastActivity: new Date()
            }
          });

          const connections = await Connection.find({
            $or: [{ user1: userId }, { user2: userId }]
          });
          connections.forEach(conn => {
            socket.to(`match_${conn._id}`).emit('presence:status', {
              userId,
              isOnline: false,
              lastSeen: new Date()
            });
          });
        }
      });
    });

    server.listen(PORT, () => {
      console.log(`📡 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failure:', err.message);
    process.exit(1);
  });
