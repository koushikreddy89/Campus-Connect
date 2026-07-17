const mongoose = require('mongoose');
const { Connection, Message, Notification } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

async function migrate() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Step 1: Find all connections
  const connections = await Connection.find({});
  console.log(`📋 Found ${connections.length} connection documents.`);

  // Group connections by sorted user IDs
  const groups = {};
  for (const conn of connections) {
    if (!conn.user1 || !conn.user2) {
      console.warn(`⚠️ Invalid connection found: ID=${conn._id}, user1=${conn.user1}, user2=${conn.user2}. Skipping.`);
      continue;
    }
    const sorted = [conn.user1, conn.user2].sort();
    const key = `${sorted[0]}_${sorted[1]}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(conn);
  }

  for (const [key, conns] of Object.entries(groups)) {
    // Sort by createdAt ASC (oldest first)
    conns.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const primary = conns[0];
    const primaryId = primary._id.toString();

    // Set conversationKey and participants on primary
    primary.conversationKey = key;
    primary.participants = key.split('_');

    // Handle duplicates
    if (conns.length > 1) {
      console.log(`\n🔄 Merging duplicate connections for users: ${key}`);
      console.log(`   Keep oldest (Primary): ID=${primaryId}, Created=${primary.createdAt}`);

      for (let i = 1; i < conns.length; i++) {
        const duplicate = conns[i];
        const duplicateId = duplicate._id.toString();
        console.log(`   Merging duplicate: ID=${duplicateId}, Created=${duplicate.createdAt}`);

        // Update Messages referencing this duplicate
        const msgUpdateResult = await Message.updateMany(
          { $or: [{ matchId: duplicateId }, { conversationId: duplicateId }] },
          { $set: { matchId: primaryId, conversationId: primaryId } }
        );
        console.log(`   -> Updated ${msgUpdateResult.modifiedCount} messages.`);

        // Update Notifications referencing this duplicate
        const notifUpdateResult = await Notification.updateMany(
          { entityType: 'chat', entityId: duplicateId },
          { $set: { entityId: primaryId } }
        );
        console.log(`   -> Updated ${notifUpdateResult.modifiedCount} notifications.`);

        // Delete the duplicate connection document
        await Connection.deleteOne({ _id: duplicate._id });
        console.log(`   -> Deleted duplicate connection document.`);
      }
    }

    // Populate lastMessage & lastMessageAt from the latest message
    const latestMessage = await Message.findOne({ matchId: primaryId }).sort({ timestamp: -1 });
    if (latestMessage) {
      let previewText = latestMessage.text || '';
      if (latestMessage.messageType === 'image') {
        previewText = 'Sent an image';
      } else if (latestMessage.messageType === 'document' || latestMessage.messageType === 'file') {
        previewText = latestMessage.documentName || 'Sent an attachment';
      }
      primary.lastMessage = previewText;
      primary.lastMessageAt = latestMessage.timestamp || latestMessage.createdAt;
    } else {
      primary.lastMessage = '';
      primary.lastMessageAt = primary.updatedAt || primary.createdAt;
    }

    // Save the primary connection
    await primary.save();
  }

  console.log('\n🎉 Connection migration and deduplication complete!');
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed with error:', err);
  process.exit(1);
});
