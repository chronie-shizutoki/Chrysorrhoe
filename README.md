# 𝙲𝚑𝚛𝚢𝚜𝚘𝚛𝚛𝚑𝚘𝚎

A web-based wallet application with frontend and backend components, supporting multi-language interface and wallet operations.

## Project Structure

```
Chrysorrhoe/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── database/              # Database setup scripts
└── package.json           # Root package.json for development scripts
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up the database**:
   ```bash
   # Follow instructions in database/README.md
   psql -U postgres -f database/init.sql
   ```

3. **Configure environment**:
   ```bash
   # Copy and edit environment files
   cp server/.env.example server/.env
   # Edit server/.env with your database credentials
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

This will start:
- Frontend development server on http://localhost:3100
- Backend API server on http://localhost:3200

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server:dev` - Start only the backend server
- `npm run client:dev` - Start only the frontend server
- `npm run install:all` - Install dependencies for all projects

### API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/wallets` - Create wallet (to be implemented)
- `GET /api/wallets/:id` - Get wallet info (to be implemented)
- `POST /api/transfers` - Execute transfer (to be implemented)

### Supported Languages

- 中文简体 (zh-CN)
- 中文繁体 (zh-TW)
- 日语 (ja-JP)
- English (en-US)

## Technology Stack

### Frontend
- React 19
- Vite (build tool)
- React Router (routing)
- React i18next (internationalization)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- Joi (validation)
- CORS, Helmet (security)

## Architecture

The application follows a client-server architecture with:
- React SPA frontend with responsive design
- RESTful API backend
- Data persistence
- Multi-language support with i18next
- Development proxy for API calls
