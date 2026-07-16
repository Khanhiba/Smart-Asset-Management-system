import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
  console.info(`MongoDB connected: ${mongoose.connection.host}`);
}
