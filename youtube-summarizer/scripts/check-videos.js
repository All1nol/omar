/**
 * Script to manually check for new videos
 * 
 * This script directly initializes the VideoDetectionService and forces
 * a check for new videos from all subscribed channels.
 */

// First, load the environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const { getServiceManager } = require('../app/lib/serviceInitializer');

async function checkVideos() {
  try {
    console.log('Initializing services...');
    
    // Get service manager
    const serviceManager = getServiceManager();
    
    // Initialize all services
    await serviceManager.initialize();
    
    // Get service status
    const status = serviceManager.getStatus();
    console.log('Service status:', status);
    
    if (!status.videoDetectionRunning) {
      console.log('Video detection service is not running, starting...');
      const videoDetectionService = serviceManager.getVideoDetectionService();
      videoDetectionService.start();
      console.log('Video detection service started');
    }
    
    // Force check for new videos
    console.log('Triggering check for new videos...');
    const videoDetectionService = serviceManager.getVideoDetectionService();
    await videoDetectionService.forceCheckForNewVideos();
    
    // Wait a bit to ensure processing has time to start
    console.log('Waiting for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check queue status
    const QueuedVideoModel = mongoose.models.QueuedVideo || 
      mongoose.model('QueuedVideo', new mongoose.Schema({}, { strict: false }));
    
    const pendingCount = await QueuedVideoModel.countDocuments({ status: 'pending' });
    const processingCount = await QueuedVideoModel.countDocuments({ status: 'processing' });
    const completedCount = await QueuedVideoModel.countDocuments({ status: 'completed' });
    const failedCount = await QueuedVideoModel.countDocuments({ status: 'failed' });
    
    console.log('Queue status:', {
      pending: pendingCount,
      processing: processingCount,
      completed: completedCount,
      failed: failedCount
    });
    
    // List the videos in the queue
    console.log('Videos in queue:');
    const queuedVideos = await QueuedVideoModel.find({}).lean();
    
    for (const video of queuedVideos) {
      console.log(`- ${video.title} (${video.videoId}) - Status: ${video.status}`);
    }
    
    console.log('Check completed successfully');
  } catch (error) {
    console.error('Error checking for videos:', error);
  } finally {
    // Clean shutdown
    console.log('Shutting down...');
    setTimeout(() => process.exit(0), 2000);
  }
}

// Run the function
checkVideos(); 