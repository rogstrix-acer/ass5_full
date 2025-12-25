import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI ?? '');

mongoose.set('strictQuery', true);

export const database = 'mongodb';