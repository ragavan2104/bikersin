// Simple in-memory system configuration store
// NOTE: This will reset on server restart. For persistence,
// back this with a database table (e.g., Prisma model).

type SystemState = {
  maintenanceMode: boolean
}

const state: SystemState = {
  maintenanceMode: false,
}

export const getMaintenanceMode = () => state.maintenanceMode

export const setMaintenanceMode = (enabled: boolean) => {
  state.maintenanceMode = enabled
}
