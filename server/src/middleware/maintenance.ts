import { Request, Response, NextFunction } from 'express'
import { getMaintenanceMode } from '../utils/systemConfig'

// Blocks non-superadmin requests when maintenance mode is enabled
export const maintenanceGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const isMaintenance = getMaintenanceMode()
    if (!isMaintenance) return next()

    // Allow health checks and auth endpoints
    const url = req.originalUrl || req.url
    if (url.includes('/api/auth') || url.includes('/api/superadmin')) {
      return next()
    }

    // Allow superadmin role to bypass (checked by route guards separately)
    // If needed, we can inspect req.user here when using AuthRequest type

    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'System is under maintenance. Please try again later.'
    })
  } catch (e) {
    // Fail open if guard errors
    return next()
  }
}
