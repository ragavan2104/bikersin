import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/auth';
import superadminRoutes from './routes/superadmin';
import tenantRoutes from './routes/tenant';
import publicRoutes from './routes/public';

// Middleware imports
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://localhost:5173',  // Vite dev server
      'http://localhost:5174'   // Additional Vite port
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/public', publicRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Bikers Management API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      tenant: '/api/tenant', 
      superadmin: '/api/superadmin',
      public: '/api/public'
    },
    docs: 'https://github.com/your-repo/api-docs'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🏢 Tenant API: http://localhost:${PORT}/api/tenant`);
        console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    });
}
