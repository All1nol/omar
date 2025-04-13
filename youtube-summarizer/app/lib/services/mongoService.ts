/**
 * MongoDB Service
 * 
 * This file contains the service for connecting to MongoDB using Mongoose.
 */

import mongoose from 'mongoose';

/**
 * Class for managing MongoDB connection
 */
export class MongoService {
  private static instance: MongoService;
  private connected = false;
  private readonly dbUri: string;
  
  /**
   * Creates a new MongoService instance
   * @param dbUri MongoDB connection URI
   */
  private constructor(dbUri: string) {
    this.dbUri = dbUri;
  }
  
  /**
   * Gets the singleton instance of MongoService
   * @param dbUri MongoDB connection URI (only used if instance doesn't exist)
   * @returns MongoService instance
   */
  public static getInstance(dbUri?: string): MongoService {
    if (!MongoService.instance) {
      if (!dbUri) {
        dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-summarizer';
      }
      MongoService.instance = new MongoService(dbUri);
    }
    return MongoService.instance;
  }
  
  /**
   * Connects to MongoDB
   * @returns Promise resolving when connected
   */
  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      await mongoose.connect(this.dbUri);
      this.connected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }
  
  /**
   * Disconnects from MongoDB
   * @returns Promise resolving when disconnected
   */
  public async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      await mongoose.disconnect();
      this.connected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Checks if service is connected to MongoDB
   * @returns Boolean indicating connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }
} 