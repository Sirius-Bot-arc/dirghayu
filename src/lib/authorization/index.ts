/**
 * Authorization module
 * Central role x action x resource permission checks
 * Single source of truth for all access control
 */

import { Role, Member, Medication, Appointment, PendingChange, ChangeType, ChangeStatus, VisibilitySettings } from '@/types';

/** Actions that can be performed */
export type Action = 
  | 'read' | 'create' | 'update' | 'delete' 
  | 'take_dose' | 'skip_dose'
  | 'approve_change' | 'reject_change'
  | 'manage_visibility' | 'manage_consent'
  | 'export_data' | 'delete_household'
  | 'scan_prescription' | 'explain_medicine' | 'check_interactions'
  | 'view_summary' | 'view_activity';

/** Resource types */
export type ResourceType = 
  | 'household' | 'member' | 'medication' | 'appointment' 
  | 'dose' | 'change' | 'activity' | 'consent' | 'visibility' | 'summary' | 'export';

/** Authorization result */
export interface AuthzResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a role can perform an action on a resource
 * This is the core authorization matrix
 */
export function can(role: Role, action: Action, resourceType: ResourceType, context?: {
  resourceOwnerId?: string;
  requesterId?: string;
  resource?: Medication | Appointment | PendingChange | Member;
  visibility?: VisibilitySettings;
  changeStatus?: ChangeStatus;
}): AuthzResult {
  // Elder permissions (highest autonomy)
  if (role === 'elder') {
    switch (resourceType) {
      case 'household':
        if (action === 'read' || action === 'delete') return { allowed: true };
        return { allowed: false, reason: 'Elders can only read or delete household' };
      
      case 'member':
        if (action === 'read') return { allowed: true };
        if (action === 'create' || action === 'update' || action === 'delete') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on member' };
      
      case 'medication':
        if (action === 'read' || action === 'create' || action === 'update' || action === 'delete') return { allowed: true };
        if (action === 'take_dose' || action === 'skip_dose') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on medication' };
      
      case 'appointment':
        if (action === 'read' || action === 'create' || action === 'update' || action === 'delete') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on appointment' };
      
      case 'dose':
        if (action === 'read' || action === 'take_dose' || action === 'skip_dose') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on dose' };
      
      case 'change':
        if (action === 'read' || action === 'approve_change' || action === 'reject_change') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on change' };
      
      case 'activity':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on activity' };
      
      case 'consent':
        if (action === 'read' || action === 'manage_consent') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on consent' };
      
      case 'visibility':
        if (action === 'read' || action === 'manage_visibility') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on visibility' };
      
      case 'summary':
        if (action === 'read' || action === 'view_summary') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on summary' };
      
      case 'export':
        if (action === 'export_data') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for elder on export' };
    }
  }

  // Caretaker permissions (can propose changes, need elder approval)
  if (role === 'caretaker') {
    switch (resourceType) {
      case 'household':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Caretakers cannot modify household' };
      
      case 'member':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Caretakers cannot manage members' };
      
      case 'medication':
        if (action === 'read') {
          // Check visibility
          if (context?.visibility && !context.visibility.medications) {
            return { allowed: false, reason: 'Medications not visible to this caretaker' };
          }
          return { allowed: true };
        }
        if (action === 'create' || action === 'update' || action === 'delete') {
          // Caretakers create pending changes, not direct modifications
          return { allowed: true }; // Handled by change creation logic
        }
        if (action === 'take_dose' || action === 'skip_dose') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for caretaker on medication' };
      
      case 'appointment':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.appointments) {
            return { allowed: false, reason: 'Appointments not visible to this caretaker' };
          }
          return { allowed: true };
        }
        if (action === 'create' || action === 'update' || action === 'delete') {
          return { allowed: true }; // Creates pending change
        }
        return { allowed: false, reason: 'Invalid action for caretaker on appointment' };
      
      case 'dose':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Adherence not visible to this caretaker' };
          }
          return { allowed: true };
        }
        if (action === 'take_dose' || action === 'skip_dose') return { allowed: true };
        return { allowed: false, reason: 'Invalid action for caretaker on dose' };
      
      case 'change':
        if (action === 'read' && context?.resource && 'requestedBy' in context.resource) {
          const change = context.resource as PendingChange;
          if (change.requestedBy === context.requesterId) return { allowed: true };
        }
        return { allowed: false, reason: 'Caretakers can only view their own proposed changes' };
      
      case 'activity':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Activity not visible to this caretaker' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Invalid action for caretaker on activity' };
      
      case 'consent':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Caretakers cannot manage consents' };
      
      case 'visibility':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Caretakers cannot manage visibility' };
      
      case 'summary':
        if (action === 'read' || action === 'view_summary') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Summary not visible to this caretaker' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Invalid action for caretaker on summary' };
      
      case 'export':
        return { allowed: false, reason: 'Caretakers cannot export data' };
    }
  }

  // Family permissions (read-only, subject to visibility)
  if (role === 'family') {
    switch (resourceType) {
      case 'household':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Family cannot modify household' };
      
      case 'member':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Family cannot manage members' };
      
      case 'medication':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.medications) {
            return { allowed: false, reason: 'Medications not visible to this family member' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Family cannot modify medications' };
      
      case 'appointment':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.appointments) {
            return { allowed: false, reason: 'Appointments not visible to this family member' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Family cannot modify appointments' };
      
      case 'dose':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Adherence not visible to this family member' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Family cannot record doses' };
      
      case 'change':
        if (action === 'read') return { allowed: false, reason: 'Family cannot view pending changes' };
        return { allowed: false, reason: 'Family cannot manage changes' };
      
      case 'activity':
        if (action === 'read') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Activity not visible to this family member' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Invalid action for family on activity' };
      
      case 'consent':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Family cannot manage consents' };
      
      case 'visibility':
        if (action === 'read') return { allowed: true };
        return { allowed: false, reason: 'Family cannot manage visibility' };
      
      case 'summary':
        if (action === 'read' || action === 'view_summary') {
          if (context?.visibility && !context.visibility.adherence) {
            return { allowed: false, reason: 'Summary not visible to this family member' };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'Invalid action for family on summary' };
      
      case 'export':
        return { allowed: false, reason: 'Family cannot export data' };
    }
  }

  return { allowed: false, reason: 'Unknown role' }
}

/**
 * Check if a member can access another member's data based on visibility
 */
export function canViewMemberData(viewer: Member, target: Member, dataType: keyof VisibilitySettings): boolean {
  if (viewer.id === target.id) return true; // Always can view own data
  if (viewer.role === 'elder') return true; // Elder sees all
  return viewer.visibility[dataType] === true;
}

/**
 * Check if a caretaker's proposed change requires elder approval
 * All caretaker changes to medications/appointments require approval
 */
export function requiresElderApproval(role: Role, changeType: ChangeType): boolean {
  if (role === 'elder') return false;
  if (role === 'caretaker') return true;
  return false; // Family cannot propose changes
}

/**
 * Get the elder member ID for a household (for approval routing)
 */
export function getElderId(members: Member[]): string | null {
  const elder = members.find(m => m.role === 'elder' && !m.deletedAt);
  return elder?.id ?? null;
}

/**
 * Validate that a member can perform a dose action
 */
export function canRecordDose(role: Role, medication: Medication, member: Member): AuthzResult {
  const authz = can(role, role === 'elder' ? 'take_dose' : 'take_dose', 'medication', {
    resource: medication,
    visibility: member.visibility,
    requesterId: member.id
  });
  return authz;
}

/**
 * Validate medication ownership/access for AI features
 */
export function canUseAI(role: Role, member: Member, consentGranted: boolean): AuthzResult {
  if (!consentGranted) {
    return { allowed: false, reason: 'AI processing consent not granted' };
  }
  if (role === 'family') {
    return { allowed: false, reason: 'Family members cannot use AI features' };
  }
  return { allowed: true };
}