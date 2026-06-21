require('dotenv').config();
const mongoose = require('mongoose');

const wipeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for wipe...');
    
    // List collections
    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      // Do not wipe Admins
      if (collection.collectionName !== 'admins') {
        await collection.drop();
        console.log(`Dropped collection ${collection.collectionName}`);
      }
    }
    
    console.log('Database wiped successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Wipe failed:', error);
    process.exit(1);
  }
};

wipeDatabase();
