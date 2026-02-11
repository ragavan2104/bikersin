# Bikers Management System - Separate Vercel Deployments

## Project Structure
This monorepo is configured for **separate Vercel deployments** for maximum flexibility:

- **Server**: Backend API (Separate deployment)
- **Tenant App**: Tenant portal (Separate deployment)
- **Superadmin App**: Super admin panel (Separate deployment)

## Deployment Strategy

### 1. Server Deployment
**Location**: `/server`
**Vercel Config**: `server/vercel.json`
**Domain**: `https://bikers-server.vercel.app`

#### Environment Variables:
```
DATABASE_URL=your-database-connection-string
JWT_SECRET=your-jwt-secret
NODE_ENV=production
CORS_ORIGINS=https://bikers-tenant.vercel.app,https://bikers-superadmin.vercel.app
UPSTASH_REDIS_REST_URL=your-redis-url (optional)
UPSTASH_REDIS_REST_TOKEN=your-redis-token (optional)
```

### 2. Tenant App Deployment
**Location**: `/apps/tenant`
**Vercel Config**: `apps/tenant/vercel.json`
**Domain**: `https://bikers-tenant.vercel.app`

#### Environment Variables:
```
VITE_API_URL=https://bikers-server.vercel.app
```

### 3. Superadmin App Deployment
**Location**: `/apps/superadmin`
**Vercel Config**: `apps/superadmin/vercel.json`
**Domain**: `https://bikers-superadmin.vercel.app`

#### Environment Variables:
```
VITE_API_URL=https://bikers-server.vercel.app/api
```

## Deployment Steps

### Option 1: Deploy All Apps from Single Repository
1. **Import the repository** 3 times in Vercel:
   - Project 1: Root directory set to `server/`
   - Project 2: Root directory set to `apps/tenant/`
   - Project 3: Root directory set to `apps/superadmin/`

### Option 2: Deploy Each App Separately
1. Create separate repositories for each app
2. Deploy each repository individually to Vercel

## Configuration Benefits
✅ **Independent scaling** - Scale each app based on usage  
✅ **Independent deployments** - Deploy updates without affecting other apps  
✅ **Separate domains** - Professional separation of concerns  
✅ **Environment isolation** - Different environment variables per app  
✅ **Cost optimization** - Pay only for what each app uses  

## Development
For local development, all apps still run together:
```bash
npm run dev  # Starts all services
```

## Access URLs (After Deployment)
- **Tenant Portal**: Direct domain (clean URLs)
- **Super Admin**: Direct domain (clean URLs)
- **API**: Direct domain for API endpoints