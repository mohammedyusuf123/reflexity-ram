# Reflexity RAM — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Stack                          │
├──────────────────────┬──────────────────────┬───────────────────┤
│  Frontend            │  Backend             │  Services         │
│  Cloudflare Pages    │  Railway/Render/Fly  │  MongoDB Atlas    │
│  React + Vite        │  Node.js + Express   │  Cloudinary       │
│  TailwindCSS         │  JWT Auth            │  Resend Email     │
│                      │  Mongoose            │  Stripe Payments  │
└──────────────────────┴──────────────────────┴───────────────────┘
```

---

## 1. Prerequisites

- [MongoDB Atlas](https://cloud.mongodb.com) account (free tier works)
- [Cloudinary](https://cloudinary.com) account (credentials already in `.env`)
- [Resend](https://resend.com) account (API key already in `.env`)
- [Stripe](https://stripe.com) account (for payments)
- [Cloudflare Pages](https://pages.cloudflare.com) account (free)
- [Railway](https://railway.app) **or** [Render](https://render.com) account (free tier)
- GitHub account

---

## 2. MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user (username + password)
3. Whitelist IP: `0.0.0.0/0` (allow all — Railway/Render have dynamic IPs)
4. Get your connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/reflexity-ram?retryWrites=true&w=majority
   ```

---

## 3. Backend Deployment

### Option A: Railway (Recommended)

1. Push this repo to GitHub (see step 5 below)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the `backend` directory as the root
> **⚠️ SECURITY — ROTATE THESE CREDENTIALS.** Earlier versions of this file
> (and of `backend/.env`) contained a **live Resend API key** and **live
> Cloudinary API key + secret**, committed to git. Treat them as burned:
> revoke the Resend key and regenerate the Cloudinary secret in their
> dashboards, then set the new values ONLY in your hosting dashboard
> (Render/Railway env vars) — never in this repo. Rotation matters more than
> scrubbing git history: once committed, a key is compromised.

4. Add environment variables from `backend/.env.example`:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://...
\1<removed-from-history>nerate a 64-char random string>
   ALLOWED_ORIGINS=https://your-site.pages.dev,https://reflexityram.com
   FRONTEND_URL=https://your-site.pages.dev
\1<removed-from-history>r Resend API key>
   FROM_EMAIL=Reflexity RAM <noreply@reflexityram.com>
   CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
\1<removed-from-history>r Cloudinary API key>
\1<removed-from-history>r Cloudinary API secret>
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Railway will auto-detect Node.js and deploy
6. Note your Railway URL: `https://reflexity-ram-api.railway.app`

### Option B: Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Build command: `npm install`
5. Start command: `node src/server.js`
6. Add the same environment variables as above
7. Note your Render URL: `https://reflexity-ram-api.onrender.com`

### Option C: Fly.io

```bash
cd backend
fly launch --name reflexity-ram-api
fly secrets set NODE_ENV=production MONGODB_URI=... JWT_SECRET=...
fly deploy
```

### Option D: VPS (Ubuntu)

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/yourusername/reflexity-ram.git
cd reflexity-ram/backend
npm install

# Set up environment
cp .env.example .env
nano .env  # Fill in all values

# Install PM2 for process management
sudo npm install -g pm2
pm2 start src/server.js --name reflexity-api
pm2 startup
pm2 save

# Set up Nginx reverse proxy
sudo apt install nginx
# Configure /etc/nginx/sites-available/reflexity-api
```

---

## 4. Seed the Database

After deploying the backend, run the seed script to create initial products and admin user:

```bash
cd backend
# For local development:
node src/scripts/seed.js

# For Railway (via Railway CLI):
railway run node src/scripts/seed.js

# For Render: Use the Shell tab in the dashboard
```

Default admin credentials (change immediately!):
- Email: `admin@reflexityram.com`
- Password: `Admin@123456`

**To customize:** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars before seeding.

---

## 5. Frontend Deployment (Cloudflare Pages)

### Step 1: Push to GitHub

```bash
cd /path/to/reflexity-ram
git init  # already done
git add .
git commit -m "Initial production build"
gh repo create reflexity-ram --private
git remote add origin https://github.com/yourusername/reflexity-ram.git
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Create a project → Connect to Git → Select your repo
3. Configure build settings:
   - **Framework preset:** Vite
   - **Root directory:** `frontend`
   - **Build command:** `npm install --legacy-peer-deps && npm run build`
   - **Build output directory:** `dist`
4. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
5. Deploy!

### Step 3: Custom Domain (Optional)

In Cloudflare Pages → Custom Domains → Add `reflexityram.com`

---

## 6. Stripe Setup

### Test Mode (Development)
1. Get test keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Use `pk_test_...` for `VITE_STRIPE_PUBLISHABLE_KEY`
3. Use `sk_test_...` for `STRIPE_SECRET_KEY`

### Webhook Setup
1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-backend.railway.app/api/stripe/webhook`
3. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Live Mode (Production)
1. Complete Stripe account verification
2. Switch to live keys in your environment variables

---

## 7. Resend Email Setup

1. Log in to [resend.com](https://resend.com)
2. Add and verify your sending domain (e.g., `reflexityram.com`)
3. Update `FROM_EMAIL` to use your verified domain:
   ```
   FROM_EMAIL=Reflexity RAM <noreply@reflexityram.com>
   ```
4. The `RESEND_API_KEY` is already configured in the `.env`

---

## 8. Post-Deployment Checklist

- [ ] Backend health check: `GET https://your-api.railway.app/api/health`
- [ ] Database seeded with products and admin user
- [ ] Admin login works at `/admin`
- [ ] Product images upload via Cloudinary
- [ ] Signup email verification works
- [ ] Password reset email works
- [ ] Stripe test payment works
- [ ] Order confirmation email works
- [ ] Change default admin password immediately

---

## 9. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | Yes | Server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Min 32 chars, random string |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs |
| `FRONTEND_URL` | Yes | Frontend URL for email links |
| `RESEND_API_KEY` | Yes | Resend API key |
| `FROM_EMAIL` | Yes | Sender email address |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook secret |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |

---

## 10. Local Development

```bash
# Clone the repo
git clone https://github.com/yourusername/reflexity-ram.git
cd reflexity-ram

# Install all dependencies
npm run install:all

# Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your values

# Seed the database
npm run seed

# Start both frontend and backend
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

---

## 11. Security Notes

- **Never commit `.env` files** — they are in `.gitignore`
- **Change the default admin password** immediately after first login
- **Use a strong JWT_SECRET** — at least 64 random characters
- **Enable MongoDB Atlas IP allowlist** for production (restrict to your backend IP if static)
- **Use Stripe test mode** until you're ready to accept real payments
- Rate limiting is enabled: 100 req/15min globally, 10 req/15min for auth endpoints
