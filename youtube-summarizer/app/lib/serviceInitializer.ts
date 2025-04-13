/**
 * Service Initializer
 * 
 * This module initializes and manages the background services for the application.
 * It ensures that services are started only once and provides methods to control them.
 */

import { MongoService } from './services/mongoService';
import { MongoSubscriptionRepository } from './subscription/subscriptionRepository';
import { NotificationService } from './notification/notificationService';
import { VideoSummarizationService } from './summarization/videoSummarizationService';
import { VideoDetectionService } from './videoDetection/videoDetectionService';

// Singleton instance for service management
class ServiceManager {
  private static instance: ServiceManager;
  private mongoService: MongoService;
  private subscriptionRepository: MongoSubscriptionRepository;
  private notificationService: NotificationService;
  private videoSummarizationService: VideoSummarizationService;
  private videoDetectionService: VideoDetectionService;
  private isInitialized: boolean = false;
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Initialize MongoDB service
    this.mongoService = MongoService.getInstance();
    
    // Initialize repositories and services
    this.subscriptionRepository = new MongoSubscriptionRepository();
    this.notificationService = new NotificationService();
    
    // Initialize video summarization service with API key
    this.videoSummarizationService = new VideoSummarizationService(
      process.env.GEMINI_API_KEY || '',
      this.notificationService
    );
    
    // Initialize video detection service with a 24-hour check interval
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    this.videoDetectionService = new VideoDetectionService(
      process.env.YOUTUBE_API_KEY || '',
      this.subscriptionRepository,
      this.videoSummarizationService,
      twentyFourHoursInMs // Set interval to 24 hours
    );
  }
  
  /**
   * Get the singleton instance
   * @returns ServiceManager instance
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }
  
  /**
   * Initialize services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Services already initialized');
      return;
    }
    
    try {
      console.log('Initializing services...');
      
      // Connect to MongoDB
      await this.mongoService.connect();
      
      // Start video summarization processing
      // Check for new videos to process every minute
      this.videoSummarizationService.startProcessing(60000);
      
      // Start video detection service
      // Check for new videos from subscribed channels every hour -- Comment outdated, interval set in constructor
      this.videoDetectionService.start();
      
      this.isInitialized = true;
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Error initializing services:', error);
      throw error;
    }
  }
  
  /**
   * Shutdown services
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('Shutting down services...');
      
      // Stop video detection service
      this.videoDetectionService.stop();
      
      // Stop video summarization processing
      this.videoSummarizationService.stopProcessing();
      
      // Disconnect from MongoDB
      await this.mongoService.disconnect();
      
      this.isInitialized = false;
      console.log('Services shutdown successfully');
    } catch (error) {
      console.error('Error shutting down services:', error);
      throw error;
    }
  }
  
  /**
   * Get status of services
   * @returns Object with service status information
   */
  public getStatus(): {
    initialized: boolean;
    mongoConnected: boolean;
    videoDetectionRunning: boolean;
    videoSummarizationRunning: boolean;
  } {
    return {
      initialized: this.isInitialized,
      mongoConnected: this.mongoService.isConnected(),
      videoDetectionRunning: this.videoDetectionService.getIsRunning(),
      videoSummarizationRunning: this.videoSummarizationService.isRunning()
    };
  }
  
  // Getter methods for accessing services
  public getSubscriptionRepository(): MongoSubscriptionRepository {
    return this.subscriptionRepository;
  }
  
  public getNotificationService(): NotificationService {
    return this.notificationService;
  }
  
  public getVideoSummarizationService(): VideoSummarizationService {
    return this.videoSummarizationService;
  }
  
  public getVideoDetectionService(): VideoDetectionService {
    return this.videoDetectionService;
  }
}

// Export the singleton instance getter
export const getServiceManager = (): ServiceManager => {
  return ServiceManager.getInstance();
};

// Initialize services in a non-blocking way
const initializeServices = async (): Promise<void> => {
  try {
    const serviceManager = getServiceManager();
    await serviceManager.initialize();
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
};

// Initialize services regardless of environment to ensure they're running
initializeServices(); 