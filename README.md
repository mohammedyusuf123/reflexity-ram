# Reflexity RAM — Production E-Commerce Platform

A full-stack, production-ready e-commerce platform for RAM/memory products. Built with React + Vite (frontend) and Node.js + Express + MongoDB (backend).

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Zustand, React Router |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt, email verification |
| Email | Resend |
| Images | Cloudinary |
| Payments | Stripe (Elements + Payment Intents) |
| Frontend hosting | Cloudflare Pages |
| Backend hosting | Railway / Render / Fly / VPS |

## Features

- **Auth:** Signup, login, logout, email verification, forgot/reset password, admin roles
- **Products:** Full CRUD via admin, Cloudinary image uploads, inventory tracking
- **Cart:** Server-side persistent cart (syncs across devices when logged in)
- **Checkout:** Stripe Payment Elements, real order creation, order confirmation emails
- **Admin:** Dashboard with stats, product/order/user management, inline editing
- **Security:** Rate limiting, JWT middleware, input validation, CORS, helmet

## Quick Start

```bash
git clone https://github.com/yourusername/reflexity-ram.git
cd reflexity-ram
npm run install:all
cp backend/.env.example backend/.env   # Fill in values
cp frontend/.env.example frontend/.env # Fill in values
npm run seed   # Seed DB with products + admin user
npm run dev    # Start both frontend (5173) and backend (5000)
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions.

## Project Structure

```
reflexity-ram/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   │   └── admin/     # Admin dashboard pages
│   │   ├── lib/           # API client, stores (Zustand)
│   │   └── App.jsx        # Router
│   ├── public/
│   │   ├── _redirects     # Cloudflare Pages SPA routing
│   │   └── _headers       # Security headers
│   └── vite.config.js
│
├── backend/           # Express API
│   ├── src/
│   │   ├── models/        # Mongoose models (User, Product, Cart, Order)
│   │   ├── routes/        # API routes
│   │   ├── middleware/     # Auth, validation, rate limiting
│   │   ├── utils/         # Email (Resend), Cloudinary
│   │   ├── config/        # Cloudinary config
│   │   ├── scripts/       # DB seed script
│   │   └── server.js      # Entry point
│   ├── .env.example
│   ├── railway.toml       # Railway deployment config
│   └── render.yaml        # Render deployment config
│
├── DEPLOY.md          # Full deployment guide
└── README.md
```

## Admin Access

After seeding, log in at `/admin` with:
- Email: `admin@reflexityram.com`
- Password: `Admin@123456`

**Change this immediately in production.**


## License

This project is licensed under the Apache License, Version 2.0. See `LICENSE` and `NOTICE`.


## Security

Do not commit real `.env` files or secrets. Use `.env.example` for placeholders only and store production values in Railway/Render/Cloudflare/GitHub secret settings. Run `npm run scan:secrets` before pushing.
