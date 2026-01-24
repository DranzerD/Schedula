# Schedula Deployment Guide

## Quick Deploy Options

### Option 1: Render (Recommended - Free)

1. **Create MongoDB Atlas Database (Free)**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account
   - Create a new cluster (free M0 tier)
   - Create a database user with username/password
   - Whitelist all IPs: `0.0.0.0/0`
   - Get your connection string (replace `<password>` with your password)

2. **Deploy to Render**
   - Go to [Render](https://render.com)
   - Connect your GitHub repository
   - Create a new Blueprint and select this repo
   - Add environment variable `MONGODB_URI` with your Atlas connection string
   - Click Deploy!

### Option 2: Vercel + Railway

**Frontend (Vercel):**

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `Schedula/frontend`
4. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.railway.app/api`

**Backend (Railway):**

1. Go to [Railway](https://railway.app)
2. Create new project from GitHub
3. Set root directory to `Schedula/backend`
4. Add environment variables:
   - `MONGODB_URI` - Your MongoDB Atlas URI
   - `JWT_SECRET` - A secure random string
   - `FRONTEND_URL` - Your Vercel frontend URL
   - `NODE_ENV` - production

### Option 3: Heroku

**Backend:**

```bash
cd backend
heroku create schedula-api
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set JWT_SECRET="your-secret"
heroku config:set NODE_ENV=production
git push heroku main
```

**Frontend:**

```bash
cd frontend
npm run build
# Deploy build folder to Netlify/Vercel
```

---

## Environment Variables Reference

### Backend (.env)

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/schedula
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-url.com
```

### Frontend (.env)

```
REACT_APP_API_URL=https://your-backend-url.com/api
```

---

## MongoDB Atlas Setup (Step by Step)

1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and create an account
3. Choose "Build a Database" → "FREE Shared" → Create Cluster
4. Create Database User:
   - Go to "Database Access" → "Add New Database User"
   - Choose Password authentication
   - Save username and password
5. Network Access:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
6. Get Connection String:
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

---

## Troubleshooting

### "Database not connected" Error

- Check your `MONGODB_URI` is correct
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify database user credentials

### CORS Errors

- Update `FRONTEND_URL` environment variable to match your frontend domain
- Ensure backend CORS settings allow your frontend origin

### Build Failures

- Run `npm install` in both frontend and backend directories
- Check Node.js version (requires 18+)
