/**
 * Status API Route
 * 
 * This file handles API requests for checking the status of services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceManager } from '../../lib/serviceInitializer';

/**
 * GET handler for retrieving service status
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const serviceManager = getServiceManager();
  const status = serviceManager.getStatus();
  
  // Force services to initialize if they're not already running
  if (!status.initialized) {
    try {
      await serviceManager.initialize();
      // Re-fetch status after initialization
      const updatedStatus = serviceManager.getStatus();
      return NextResponse.json({
        status: updatedStatus,
        message: 'Services were not running and have been initialized'
      });
    } catch (error) {
      return NextResponse.json({
        status,
        error: `Failed to initialize services: ${error}`,
        message: 'Services are not running'
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    status,
    message: 'Service status retrieved successfully'
  });
}

/**
 * POST handler for controlling services
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }
    
    const serviceManager = getServiceManager();
    
    switch (action) {
      case 'start':
        await serviceManager.initialize();
        return NextResponse.json({ success: true, message: 'Services started' });
        
      case 'stop':
        await serviceManager.shutdown();
        return NextResponse.json({ success: true, message: 'Services stopped' });
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error controlling services:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to control services' },
      { status: 500 }
    );
  }
} 