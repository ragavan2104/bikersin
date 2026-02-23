import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { getMaintenanceSettings, incrementBlockedRequests, isPathAllowed } from '../utils/systemConfig'

// Enhanced maintenance guard with comprehensive features
export const maintenanceGuard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await getMaintenanceSettings()
    
    if (!settings.enabled) {
      return next()
    }

    const path = req.originalUrl || req.url
    
    // Check if path is in allowlist
    if (isPathAllowed(path, settings.allowedPaths)) {
      return next()
    }

    // Allow superadmin to bypass (if authenticated)
    if (req.user?.role === 'SUPERADMIN') {
      return next()
    }

    // Log blocked request for observability
    console.warn(`Maintenance mode blocked request: ${req.method} ${path} from ${req.ip}`, {
      path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user?.userId || 'anonymous'
    })

    // Increment blocked request count (fire and forget)
    incrementBlockedRequests().catch(err => 
      console.warn('Failed to increment blocked request count:', err.message)
    )

    // Calculate retry-after header if end time is available
    const retryAfter = settings.endAt 
      ? Math.max(0, Math.ceil((settings.endAt.getTime() - Date.now()) / 1000))
      : 3600 // Default 1 hour

    // Set maintenance response headers
    res.set({
      'Retry-After': retryAfter.toString(),
      'X-Maintenance-Type': settings.type,
      'X-Maintenance-Message': settings.message
    })

    // Check if request accepts HTML (web browser)
    const acceptsHtml = req.accepts('html')
    
    if (acceptsHtml) {
      // Serve lightweight maintenance page for browser requests
      const maintenanceHtml = generateMaintenanceHTML(settings, retryAfter)
      return res.status(503).type('html').send(maintenanceHtml)
    }

    // JSON response for API requests
    return res.status(503).json({
      error: 'Service Unavailable',
      message: settings.message,
      type: settings.type,
      retryAfter,
      scheduledEnd: settings.endAt?.toISOString(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Maintenance guard error:', error)
    // Fail open if guard errors
    return next()
  }
}

// Generate lightweight maintenance HTML page
function generateMaintenanceHTML(settings: any, retryAfter: number): string {
  const isPlanned = settings.type === 'planned'
  const endTime = settings.endAt ? new Date(settings.endAt).toLocaleString() : null
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>System Maintenance - Bikers Management</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
           margin: 0; padding: 20px; background: #f5f5f5; display: flex; align-items: center; 
           justify-content: center; min-height: 100vh; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                 text-align: center; max-width: 500px; }
    .icon { font-size: 48px; color: ${isPlanned ? '#f59e0b' : '#ef4444'}; margin-bottom: 20px; }
    h1 { color: #1f2937; margin: 0 0 16px 0; }
    p { color: #6b7280; line-height: 1.6; margin: 16px 0; }
    .status { background: ${isPlanned ? '#fef3c7' : '#fee2e2'}; color: ${isPlanned ? '#92400e' : '#991b1b'}; 
              padding: 8px 16px; border-radius: 4px; font-weight: 500; display: inline-block; margin: 16px 0; }
    .retry-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; 
                 cursor: pointer; font-size: 16px; margin-top: 20px; }
    .retry-btn:hover { background: #2563eb; }
    .time { font-weight: 500; color: #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${isPlanned ? '🔧' : '⚠️'}</div>
    <h1>${isPlanned ? 'Scheduled Maintenance' : 'System Maintenance'}</h1>
    <div class="status">${settings.type.toUpperCase()} MAINTENANCE</div>
    <p>${settings.message}</p>
    ${endTime ? `<p>Expected completion: <span class="time">${endTime}</span></p>` : ''}
    <p>We apologize for any inconvenience. Please try again ${endTime ? 'after the maintenance window' : 'in a few minutes'}.</p>
    <button class="retry-btn" onclick="window.location.reload()">Retry Now</button>
  </div>
  <script>
    // Auto-refresh every minute if end time is near
    ${retryAfter < 3600 ? `setTimeout(() => window.location.reload(), ${Math.min(retryAfter * 1000, 60000)});` : ''}
  </script>
</body>
</html>`
}
