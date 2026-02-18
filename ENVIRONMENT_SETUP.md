# 🔐 Environment Configuration Guide

## 🌐 Your Custom Domains
- **Backend API**: https://backendbikers.ragav.dev
- **Superadmin Portal**: https://bikers.ragav.dev  
- **Tenant Portal**: https://mybikers.ragav.dev

## 📁 Environment Files

### 🚀 Production Environment Files

**Server (Backend)**
```bash
# Copy this to server/.env for production
cp ENV_PRODUCTION_SERVER.env server/.env
```

**Superadmin Frontend** 
```bash
# Copy this to apps/superadmin/.env for production
cp ENV_PRODUCTION_SUPERADMIN.env apps/superadmin/.env
```

**Tenant Frontend**
```bash
# Copy this to apps/tenant/.env for production  
cp ENV_PRODUCTION_TENANT.env apps/tenant/.env
```

### 🏠 Local Development Environment Files

**Server (Backend)**
```bash
# Copy this to server/.env for local development
cp ENV_LOCAL_SERVER.env server/.env
```

**Superadmin Frontend**
```bash
# Copy this to apps/superadmin/.env for local development
cp ENV_LOCAL_SUPERADMIN.env apps/superadmin/.env
```

**Tenant Frontend**
```bash
# Copy this to apps/tenant/.env for local development
cp ENV_LOCAL_TENANT.env apps/tenant/.env
```

## 🔥 Firebase Setup Required

You still need to add your `firebase-service-account.json` file in the `server/` directory with your Firebase credentials:

```json
{
  "type": "service_account",
  "project_id": "bikers-2f015",
  "private_key_id": "your-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@bikers-2f015.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40bikers-2f015.iam.gserviceaccount.com"
}
```

## 🚀 Quick Deploy Commands

### For Production:
```bash
# Setup Production Environment
cp ENV_PRODUCTION_SERVER.env server/.env
cp ENV_PRODUCTION_SUPERADMIN.env apps/superadmin/.env  
cp ENV_PRODUCTION_TENANT.env apps/tenant/.env

# Deploy to your domains
# Backend → https://backendbikers.ragav.dev
# Superadmin → https://bikers.ragav.dev
# Tenant → https://mybikers.ragav.dev
```

### For Local Development:
```bash
# Setup Local Environment  
cp ENV_LOCAL_SERVER.env server/.env
cp ENV_LOCAL_SUPERADMIN.env apps/superadmin/.env
cp ENV_LOCAL_TENANT.env apps/tenant/.env

# Start all services
npm run dev  # Starts all services concurrently
```

## 🔑 Login Credentials

**Superadmin Portal** (https://bikers.ragav.dev):
- admin@bikers.com / admin123
- ragavan212205@gmail.com / 123456

**Tenant Portal** (https://mybikers.ragav.dev):  
- admin@acme.com / admin123
- admin@speedwheel.com / admin123