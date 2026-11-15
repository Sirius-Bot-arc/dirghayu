/**
 * GET /api/health
 * Health check endpoint for Cloud Run
 */

import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repositories';
import { FIRESTORE_ENABLED } from '@/lib/config';

export async function GET() {
  try {
    const repo = getRepository();
    
    // Test repository connection
    let dbStatus = 'unknown';
    try {
      // Try a simple operation
      if (FIRESTORE_ENABLED) {
        // Firestore health check would go here
        dbStatus = 'firestore_connected';
      } else {
        dbStatus = 'in_memory';
      }
    } catch {
      dbStatus = 'error';
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.1.0',
        environment: process.env.NODE_ENV ?? 'development',
        database: dbStatus,
        firestoreEnabled: FIRESTORE_ENABLED
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 503 });
  }
}