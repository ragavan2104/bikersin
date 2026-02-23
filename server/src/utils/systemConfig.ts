import { db } from '../lib/db';
import { MaintenanceSettings } from '../types/models';
import { logAdminAction } from './adminHelpers';

// In-memory cache with TTL
interface MaintenanceCache {
  data: MaintenanceSettings | null;
  lastFetched: number;
  ttl: number; // 30 seconds
}

const cache: MaintenanceCache = {
  data: null,
  lastFetched: 0,
  ttl: 30000
};

// Default maintenance settings
const DEFAULT_MAINTENANCE: Omit<MaintenanceSettings, keyof import('../types/models').BaseDocument> = {
  enabled: false,
  message: 'System is under maintenance. Please try again later.',
  type: 'emergency',
  allowedPaths: [
    '/api/health',
    '/api/public',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/superadmin'
  ],
  blockedRequestCount: 0,
  updatedBy: 'system'
};

async function getMaintenanceFromFirestore(): Promise<MaintenanceSettings> {
  try {
    const settings = await db.getMaintenanceSettings();
    return settings || await createDefaultMaintenanceSettings();
  } catch (error) {
    console.error('Failed to fetch maintenance settings from Firestore:', error);
    // Fallback to default settings
    return await createDefaultMaintenanceSettings();
  }
}

async function createDefaultMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    return await db.createMaintenanceSettings(DEFAULT_MAINTENANCE);
  } catch (error) {
    console.error('Failed to create default maintenance settings:', error);
    // Return in-memory default if database fails
    return {
      id: 'maintenance',
      ...DEFAULT_MAINTENANCE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export const getMaintenanceMode = async (): Promise<boolean> => {
  try {
    const settings = await getMaintenanceSettings();
    
    // Check if scheduled maintenance should be active
    if (settings.startAt && settings.endAt) {
      const now = new Date();
      const isInWindow = now >= settings.startAt && now <= settings.endAt;
      
      // Auto-disable if past end time
      if (settings.enabled && now > settings.endAt) {
        await setMaintenanceMode(false, 'system', 'Automatically disabled after scheduled window');
        return false;
      }
      
      // Auto-enable if in scheduled window
      if (!settings.enabled && isInWindow && settings.type === 'planned') {
        await setMaintenanceMode(true, 'system', 'Automatically enabled for scheduled maintenance');
        return true;
      }
    }
    
    return settings.enabled;
  } catch (error) {
    console.error('Error getting maintenance mode:', error);
    return false; // Fail open
  }
};

export const getMaintenanceSettings = async (): Promise<MaintenanceSettings> => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cache.data && (now - cache.lastFetched) < cache.ttl) {
    return cache.data;
  }
  
  // Fetch fresh data
  const settings = await getMaintenanceFromFirestore();
  
  // Update cache
  cache.data = settings;
  cache.lastFetched = now;
  
  return settings;
};

export const setMaintenanceMode = async (
  enabled: boolean, 
  updatedBy: string, 
  reason?: string,
  options?: Partial<Pick<MaintenanceSettings, 'message' | 'startAt' | 'endAt' | 'type'>>
): Promise<MaintenanceSettings> => {
  try {
    const currentSettings = await getMaintenanceSettings();
    
    const updatedSettings: Partial<MaintenanceSettings> = {
      enabled,
      updatedBy,
      updatedAt: new Date().toISOString(),
      ...options
    };
    
    // Reset blocked request count when toggling
    if (currentSettings.enabled !== enabled) {
      updatedSettings.blockedRequestCount = 0;
    }
    
    const newSettings = await db.updateMaintenanceSettings(currentSettings.id, updatedSettings);
    
    // Clear cache
    cache.data = null;
    
    // Log admin action
    await logAdminAction(
      updatedBy, 
      enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
      { 
        reason: reason || (enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'),
        type: options?.type || currentSettings.type,
        scheduledStart: options?.startAt?.toISOString(),
        scheduledEnd: options?.endAt?.toISOString()
      }
    );
    
    console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by ${updatedBy}${reason ? `: ${reason}` : ''}`);
    
    return newSettings;
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    throw error;
  }
};

export const incrementBlockedRequests = async (): Promise<void> => {
  try {
    const settings = await getMaintenanceSettings();
    await db.updateMaintenanceSettings(settings.id, {
      blockedRequestCount: (settings.blockedRequestCount || 0) + 1
    });
    // Don't update cache for this counter to avoid frequent cache invalidation
  } catch (error: any) {
    // Fail silently as this is just metrics
    console.warn('Failed to increment blocked request count:', error.message);
  }
};

export const isPathAllowed = (path: string, allowedPaths: string[]): boolean => {
  return allowedPaths.some(allowedPath => {
    // Support wildcards
    if (allowedPath.endsWith('/*')) {
      const basePath = allowedPath.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path.startsWith(allowedPath);
  });
};
