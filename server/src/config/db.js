import mongoose from 'mongoose';

const connectionStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let listenersAttached = false;

function attachConnectionLogging() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('error', (error) => console.error(JSON.stringify({ level: 'error', event: 'mongodb_error', message: error.message })));
  mongoose.connection.on('disconnected', () => console.warn(JSON.stringify({ level: 'warn', event: 'mongodb_disconnected' })));
  mongoose.connection.on('reconnected', () => console.info(JSON.stringify({ level: 'info', event: 'mongodb_reconnected' })));
}

export function databaseStatus() {
  const state = mongoose.connection.readyState;
  return { ready: state === 1, state: connectionStates[state] || 'unknown' };
}

export async function connectDatabase(uri, { attempts = 5 } = {}) {
  if (!uri) throw new Error('MONGODB_URI is required. Configure a MongoDB Atlas connection string before starting the API.');
  mongoose.set('strictQuery', true);
  attachConnectionLogging();
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: 10, minPoolSize: 1, retryWrites: true });
      console.info(JSON.stringify({ level: 'info', event: 'mongodb_connected', host: mongoose.connection.host }));
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      const retryInMs = Math.min(1000 * (2 ** (attempt - 1)), 8000);
      console.error(JSON.stringify({ level: 'error', event: 'mongodb_connect_failed', attempt, attempts, message: error.message, retryInMs: attempt < attempts ? retryInMs : undefined }));
      if (attempt < attempts) await wait(retryInMs);
    }
  }
  throw new Error(`MongoDB could not be reached after ${attempts} attempts: ${lastError?.message || 'unknown error'}`);
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
