import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, RefreshCw, Home, Shield } from 'lucide-react'

interface MaintenanceInfo {
  message: string
  type: 'emergency' | 'planned'
  endTime?: string
  retryAfter?: number
}

interface MaintenanceScreenProps {
  maintenanceInfo?: MaintenanceInfo
  onRetry?: () => void
  onGoHome?: () => void
}

export default function MaintenanceScreen({ 
  maintenanceInfo, 
  onRetry, 
  onGoHome 
}: MaintenanceScreenProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number>(0)

  useEffect(() => {
    if (!maintenanceInfo?.endTime) return

    const updateTimeLeft = () => {
      const now = new Date()
      const end = new Date(maintenanceInfo.endTime!)
      const diff = end.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Maintenance should be complete')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m remaining`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s remaining`)
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [maintenanceInfo?.endTime])

  useEffect(() => {
    // Auto-retry countdown for short maintenance windows
    if (maintenanceInfo?.retryAfter && maintenanceInfo.retryAfter < 1800) { // Less than 30 minutes
      setAutoRetryCountdown(Math.min(maintenanceInfo.retryAfter, 300)) // Max 5 minutes

      const countdown = setInterval(() => {
        setAutoRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdown)
            onRetry?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [maintenanceInfo?.retryAfter, onRetry])

  const isPlanned = maintenanceInfo?.type === 'planned'
  const IconComponent = isPlanned ? Clock : AlertTriangle
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Admin Badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
          <Shield className="h-3 w-3 mr-1" />
          SuperAdmin Portal
        </div>

        {/* Icon */}
        <div className={`mx-auto mb-6 p-4 rounded-full ${
          isPlanned 
            ? 'bg-amber-100 text-amber-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          <IconComponent className="h-12 w-12" />
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          isPlanned
            ? 'bg-amber-100 text-amber-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {isPlanned ? 'Scheduled Maintenance' : 'Emergency Maintenance'}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          System Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {maintenanceInfo?.message || 'The admin portal is currently undergoing maintenance. SuperAdmin access may be limited.'}
        </p>

        {/* Admin Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> As a SuperAdmin, you should still have access to critical functions. 
            If you're seeing this message, the maintenance may be affecting core systems.
          </p>
        </div>

        {/* Time Information */}
        {timeLeft && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center text-gray-700">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-medium">{timeLeft}</span>
            </div>
            {maintenanceInfo?.endTime && (
              <p className="text-sm text-gray-500 mt-2">
                Expected completion: {new Date(maintenanceInfo.endTime).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Auto-retry countdown */}
        {autoRetryCountdown > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center text-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="font-medium">
                Auto-retry in {Math.floor(autoRetryCountdown / 60)}:{(autoRetryCountdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Access
          </button>
          
          <button
            onClick={onGoHome}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Login
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            For system emergencies, check server logs directly
          </p>
          {isPlanned && (
            <p className="text-xs text-blue-600 mt-1">
              This maintenance was scheduled in advance
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for checking maintenance mode
export const useMaintenanceCheck = () => {
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkMaintenanceStatus = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/health')
      
      if (response.status === 503) {
        // System is in maintenance mode
        const retryAfter = response.headers.get('Retry-After')
        const maintenanceMessage = response.headers.get('X-Maintenance-Message')
        const maintenanceType = response.headers.get('X-Maintenance-Type') as 'emergency' | 'planned'
        
        const data = await response.json().catch(() => ({}))
        
        setMaintenanceInfo({
          message: maintenanceMessage || data.message || 'System is under maintenance',
          type: maintenanceType || 'emergency',
          endTime: data.scheduledEnd,
          retryAfter: retryAfter ? parseInt(retryAfter) : undefined
        })
        return true
      } else {
        setMaintenanceInfo(null)
        return false
      }
    } catch (error) {
      // If we can't reach the server, assume it's maintenance
      setMaintenanceInfo({
        message: 'Unable to connect to the server. The system may be under maintenance.',
        type: 'emergency'
      })
      return true
    } finally {
      setIsChecking(false)
    }
  }

  return { maintenanceInfo, isChecking, checkMaintenanceStatus }
}