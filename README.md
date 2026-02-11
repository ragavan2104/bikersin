# 🏍️ Bikers Management System

A comprehensive monorepo bike management platform with superadmin and tenant portals.

## 🏗️ Architecture

```
bikers/
├── 🖥️ Backend API (Port 5000)
├── 👑 Superadmin App (Port 3000)  
├── 🏢 Tenant App (Port 3001)
├── 🗄️ PostgreSQL Database
└── 📦 Shared Configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm/yarn

### 1. Environment Setup
```bash
# Root directory
cp .env.example .env

# Backend
cd server
cp .env.example .env
# Update DATABASE_URL and JWT_SECRET

# Superadmin App
cd ../apps/superadmin
cp .env.example .env

# Tenant App  
cd ../tenant
cp .env.example .env
```

### 2. Install Dependencies
```bash
# Root level
npm install

# Backend
cd server && npm install

# Superadmin
cd ../apps/superadmin && npm install

# Tenant
cd ../tenant && npm install
```

### 3. Database Setup
```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed test data
npm run seed
```

### 4. Start Development Servers
```bash
# Windows
start-dev.bat

# macOS/Linux
chmod +x start-dev.sh && ./start-dev.sh

# Or manually:
cd server && npm run dev          # Backend :5000
cd apps/superadmin && npm run dev # Superadmin :3000
cd apps/tenant && npm run dev     # Tenant :3001
```

## 🎯 Features

### 👑 Superadmin Portal

#### Company Management
- **Create Companies**: Add new tenant companies with logo upload
- **Suspend/Activate**: Enable/disable company access
- **View All Companies**: List with status and statistics
- **Delete Companies**: Remove companies and associated data
- **Company Stats**: Individual company metrics

#### User Management  
- **Create Admin Users**: Generate admin accounts for companies
- **View All Users**: System-wide user listing
- **User Statistics**: Role-based counts and activity

#### Platform Monitoring
- **System Health**: User counts, sales totals, active companies
- **Platform Statistics**: Real-time metrics dashboard
- **Activity Monitoring**: User engagement tracking

#### Broadcasting System
- **Global Announcements**: System-wide notifications
- **Targeted Messages**: Company-specific broadcasts
- **Message Management**: Create, edit, delete announcements

#### God Mode
- **Tenant Impersonation**: Generate auth tokens for any company
- **Direct Access**: Login as any tenant user
- **Audit Trail**: Track impersonation activities

### 🏢 Tenant Portal

#### Inventory Management
- **Bike CRUD**: Add, edit, delete bikes
- **Status Tracking**: Available vs. sold status  
- **Price Management**: Buy/sell price tracking
- **Registration Numbers**: Unique bike identification

#### Sales & Reports
- **Mark as Sold**: Convert inventory to sales
- **Profit Reports**: Revenue and profit calculations
- **PDF Receipts**: Auto-generated sales documents
- **Financial Analytics**: Performance metrics

#### User Access
- **Role-based Permissions**: Admin vs. Worker access levels
- **Company Isolation**: Data segregation by tenant
- **Secure Authentication**: JWT-based sessions

## 🔧 API Endpoints

### Authentication
```http
POST /api/auth/login          # User login
POST /api/auth/register       # User registration  
GET  /api/auth/profile        # Get user profile
POST /api/auth/refresh        # Refresh token
```

### Superadmin APIs
```http
# Company Management
GET    /api/superadmin/companies              # List all companies
POST   /api/superadmin/companies              # Create company
PUT    /api/superadmin/companies/:id          # Update company
DELETE /api/superadmin/companies/:id          # Delete company
GET    /api/superadmin/companies/:id/stats    # Company statistics

# User Management  
GET    /api/superadmin/users                  # List all users
POST   /api/superadmin/users                  # Create admin user
GET    /api/superadmin/users/:id              # Get user details
PUT    /api/superadmin/users/:id              # Update user
DELETE /api/superadmin/users/:id              # Delete user

# Platform Health
GET    /api/superadmin/stats                  # Platform statistics
GET    /api/superadmin/health                 # System health

# Broadcasting
GET    /api/superadmin/announcements          # List announcements  
POST   /api/superadmin/announcements          # Create announcement
PUT    /api/superadmin/announcements/:id      # Update announcement
DELETE /api/superadmin/announcements/:id      # Delete announcement

# God Mode
POST   /api/superadmin/impersonate            # Generate tenant token
```

### Tenant APIs
```http
# Bikes
GET    /api/tenant/bikes          # List company bikes
POST   /api/tenant/bikes          # Add bike
PUT    /api/tenant/bikes/:id      # Update bike  
DELETE /api/tenant/bikes/:id      # Delete bike

# Sales
POST   /api/tenant/bikes/:id/sell # Mark bike as sold
GET    /api/tenant/sales          # Sales history
GET    /api/tenant/reports        # Financial reports

# Announcements
GET    /api/tenant/announcements  # Company announcements
```

## 🔑 Test Credentials

After running the seed script:

### Superadmin Portal (localhost:3000)
```
Email: admin@bikers.com
Password: admin123
```

### Tenant Portal (localhost:3001)
```
# Active Companies
Acme Bikes Admin: admin@acme.com / admin123
Acme Bikes Worker: worker@acme.com / worker123
SpeedWheel Admin: admin@speedwheel.com / admin123  
SpeedWheel Worker: worker@speedwheel.com / worker123

# Suspended Company (for testing)
Thunder Admin: admin@thunder.com / admin123
```

## 📊 Sample Data

The seed script creates:
- **3 Companies** (2 active, 1 suspended)
- **6 Users** (1 superadmin, 3 admins, 2 workers)  
- **7 Bikes** (3 sold, 4 available)
- **4 Announcements** (1 global, 3 targeted)

## 🛠️ Tech Stack

### Backend
- **Node.js + Express**: REST API server
- **Prisma ORM**: Database management
- **PostgreSQL**: Primary database
- **JWT + Bcrypt**: Authentication & security
- **PDFKit**: Receipt generation
- **CORS + Morgan**: Middleware stack

### Frontend
- **React + TypeScript**: UI framework
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling framework
- **Axios**: HTTP client
- **React Router**: Client-side routing

### DevOps
- **Vercel**: Deployment platform
- **Environment Variables**: Configuration management
- **Git**: Version control
- **npm workspaces**: Monorepo management

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Superadmin, Admin, Worker roles
- **Tenant Isolation**: Company data segregation
- **Password Hashing**: Bcrypt encryption
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Request sanitization
- **Audit Logging**: Action tracking

## 📁 Project Structure

```
bikers/
├── apps/
│   ├── superadmin/          # React superadmin portal
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── contexts/    # React contexts
│   │   │   ├── pages/       # Route pages
│   │   │   └── utils/       # Helper functions
│   │   └── vite.config.ts
│   └── tenant/              # React tenant portal
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── contexts/    # React contexts  
│       │   ├── pages/       # Route pages
│       │   └── utils/       # Helper functions
│       └── vite.config.ts
├── server/                  # Express backend
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── src/
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Express middleware
│       ├── routes/          # Route definitions
│       ├── utils/           # Helper functions
│       ├── seed.ts          # Database seeding
│       └── server.ts        # Express app
├── package.json             # Root dependencies
├── vercel.json             # Deployment config
└── README.md               # This file
```

## 🚀 Deployment

### Vercel Configuration
The project includes Vercel configuration with:
- **3009MB Memory**: Enhanced performance
- **Environment Variables**: Production settings
- **Build Commands**: Optimized builds
- **Static Assets**: Efficient serving

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=10

# Frontend
VITE_API_URL=http://localhost:5000
```

## 📝 Development Notes

### Database Migrations
```bash
cd server
npx prisma migrate dev --name migration_name
npx prisma generate
```

### Adding New Features
1. Update Prisma schema if needed
2. Create/update controllers
3. Add/modify routes
4. Update frontend components
5. Test with seed data

### Debugging
- Backend logs in terminal
- Frontend dev tools
- Database with Prisma Studio: `npx prisma studio`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

🏍️ **Happy Coding!** Built with ❤️ for efficient bike management.