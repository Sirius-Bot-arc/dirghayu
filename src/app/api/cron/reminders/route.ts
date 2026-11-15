/**
 * POST /api/cron/reminders
 * Cloud Scheduler calls this every 5 minutes with X-Cron-Secret header
 * Processes all reminder types for all households (or specific household)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepository } from '@/lib/repositories';
import { processAllReminders } from '@/lib/reminders';
import { CRON_SECRET } from '@/lib/config';

const cronRemindersSchema = z.object({
  timestamp: z.string().datetime({ offset: true }).optional(),
  trigger: z.enum(['scheduled', 'manual']).default('scheduled')
});

/** Constant-time secret comparison */
function verifyCronSecret(provided: string | null): boolean {
  if (!provided || !CRON_SECRET) return false;
  if (provided.length !== CRON_SECRET.length) return false;
  
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (!verifyCronSecret(cronSecret)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' }}, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = cronRemindersSchema.parse(body);

    const repo = getRepository();

    // For in-memory demo, we need to process all households
    // In Firestore, we'd query households in batches
    let households: any[] = [];
    
    if (process.env.FIRESTORE_ENABLED === 'true') {
      // Firestore: query households in batches
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      const snapshot = await db.collection('households').where('deletedAt', '==', null).limit(500).get();
      households = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // In-memory: get from repository
      // This is a limitation of in-memory repo - we'd need to track households
      // For demo, we'll skip if no household specified
      const householdId = request.nextUrl.searchParams.get('householdId');
      if (householdId) {
        const household = await repo.getHousehold(householdId as any);
        if (household) households = [household];
      }
    }

    const results = {
      processed: 0,
      upcomingDoses: 0,
      missedDoses: 0,
      appointments: 0,
      refills: 0,
      errors: [] as string[]
    };

    for (const household of households) {
      try {
        const result = await processAllReminders(household.id);
        results.processed++;
        results.upcomingDoses += result.upcomingDoses;
        results.missedDoses += result.missedDoses;
        results.appointments += result.appointments;
        results.refills += result.refills;
      } catch (error) {
        results.errors.push(`${household.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    console.error('Cron reminders error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Cron job failed' }}, { status: 500 });
  }
}