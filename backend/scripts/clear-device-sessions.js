import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        // Clear all activeDeviceId and activeSessionCreatedAt
        const result = await mongoose.connection.db.collection('users').updateMany(
            {},
            { $set: { activeDeviceId: null, activeSessionCreatedAt: null } }
        );

        console.log(`Updated ${result.modifiedCount} users - cleared device sessions`);

        await mongoose.connection.close();
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
