/**
 * Database Service
 * 
 * This file contains the service for interacting with the database.
 * It follows the Repository pattern to abstract away database operations.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Simple file-based database for development
// In production, this should be replaced with a real database
export class DatabaseService {
  private basePath: string;
  
  constructor() {
    // Set the base path for data storage
    this.basePath = path.join(process.cwd(), 'data');
    this.ensureDirectoryExists();
  }
  
  /**
   * Ensure the data directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }
  
  /**
   * Save data to a file
   * @param collection Collection name
   * @param data Data to save
   * @returns Promise resolving to true if successful
   */
  async saveData<T>(collection: string, data: T[]): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, `${collection}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving data to ${collection}:`, error);
      return false;
    }
  }
  
  /**
   * Load data from a file
   * @param collection Collection name
   * @returns Promise resolving to array of items or empty array if file doesn't exist
   */
  async loadData<T>(collection: string): Promise<T[]> {
    try {
      const filePath = path.join(this.basePath, `${collection}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T[];
    } catch (error) {
      // If file doesn't exist, return empty array
      return [];
    }
  }
} 