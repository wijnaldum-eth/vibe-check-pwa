# Backend Structure Document for "Vibe Check"

This document outlines the backend architecture, hosting solution, and infrastructure components for the "Vibe Check" Progressive Web App (PWA), a daily crypto sentiment tracker optimized for Farcaster Frames and Base mini-apps. It is written in everyday language to ensure clarity for all stakeholders.

## 1. Backend Architecture

**Overview**
The backend is organized as a monorepo using pnpm workspaces. It separates responsibilities into distinct packages and services:

- **apps/web:** Next.js 15 PWA (frontend) using the App Router
- **apps/api:** Express.js server with type-safe tRPC endpoints (business logic)
- **contracts:** Foundry project containing the ERC-721 smart contract for NFT badges
- **packages/shared:** Shared TypeScript types and utility code

**Design Patterns & Frameworks**

- **Monorepo (pnpm workspaces):** Single code base for all services, promoting code reuse and consistent dependency management
- **Express.js + tRPC:** Dedicated API service exposing type-safe remote procedure calls, ensuring end-to-end types from frontend to database
- **Next.js App Router:** Server components, optimized rendering, built-in PWA support (service worker, web manifest)
- **Drizzle ORM:** Lightweight TypeScript ORM for PostgreSQL, providing compile-time type safety on database queries

**Scalability, Maintainability, Performance**

- **Separation of Concerns:** Frontend and backend live in separate folders, allowing the API service to scale independently (e.g., deploy multiple API instances behind a load balancer)
- **Type Safety:** Shared types between frontend and backend reduce bugs and simplify refactors
- **Containerization:** Docker images for each service make it easy to scale horizontally and maintain consistent environments
- **Caching (Redis):** Offloads frequent reads (leaderboard, aggregated sentiment) from PostgreSQL, improving response time under load

## 2. Database Management

**Technologies Used**

- **PostgreSQL (SQL):** Primary data store for user profiles, mood logs, streaks
- **Redis (NoSQL, key-value):** Caching layer for high-read operations (network sentiment, global leaderboard)
- **Drizzle ORM:** Simplifies query construction, migrations, and type inference in TypeScript

**Data Structure & Access**

- **Relational Data:** Structured in normalized tables (users, mood_logs, streaks)
- **Cache Keys:** Redis keys follow clear naming patterns (e.g., `leaderboard:global`, `sentiment:network:{userId}`)
- **Access Patterns:**
  - Write operations (mood logging) go directly to PostgreSQL
  - Read operations for frequently accessed aggregates query Redis first, with fallback to PostgreSQL if cache miss occurs
  - Background workers or scheduled jobs refresh cache entries at defined intervals

**Data Management Practices**

- **Migrations:** Drizzle schema migrations ensure consistent database upgrades across environments
- **Backups:** Automated daily backups of PostgreSQL with point-in-time recovery
- **Cache Eviction:** TTL (time-to-live) policies on Redis keys to guarantee freshness (e.g., 5-minute TTL for network sentiment)

## 3. Database Schema

**Key Tables (PostgreSQL)**

1. **users** — stores wallet-based profiles
   - id (UUID, primary key)
   - wallet_address (text, unique)
   - created_at (timestamp)

2. **mood_logs** — daily mood entries
   - id (UUID, primary key)
   - user_id (UUID, foreign key → users.id)
   - mood_value (integer, 1–5 scale)
   - logged_at (date)

3. **streaks** — tracks consecutive daily log counts
   - id (UUID, primary key)
   - user_id (UUID, foreign key → users.id)
   - current_streak (integer)
   - longest_streak (integer)
   - last_logged_date (date)

4. **nft_badges** — records issued NFT badges
   - id (UUID, primary key)
   - user_id (UUID, foreign key → users.id)
   - token_id (bigint)
   - issued_at (timestamp)

5. **network_sentiment** — aggregated sentiment per user’s social graph
   - user_id (UUID, primary key, foreign key → users.id)
   - sentiment_score (float)
   - updated_at (timestamp)

**Example SQL Schema**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  mood_value INTEGER NOT NULL CHECK (mood_value BETWEEN 1 AND 5),
  logged_at DATE NOT NULL,
  UNIQUE(user_id, logged_at)
);

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_logged_date DATE
);

CREATE TABLE nft_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token_id BIGINT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE network_sentiment (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  sentiment_score FLOAT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```  

## 4. API Design and Endpoints

**Approach**
- **tRPC over HTTP:** Type-safe RPC interface, no separate schema files
- **Express.js Router:** Wraps tRPC handlers and middleware (rate limiting, CORS)

**Key Endpoints / Procedures**

1. **auth.connectWallet** — establishes a session for a wallet address
2. **mood.logEntry** — records a new mood log (writes to `mood_logs`, updates `streaks`)
3. **mood.getHistory** — fetches recent mood logs for charting
4. **streak.getCurrent** — returns current and longest streak for a user
5. **leaderboard.getGlobal** — returns top users by streak length (reads from Redis cache)
6. **sentiment.getNetwork** — retrieves aggregated sentiment for user’s social graph (caches result in Redis)
7. **nft.mintBadge** — triggers NFT mint via Alchemy SDK when streak milestone is met
8. **frame.generateOgImage** — dynamic OG image for Farcaster Frames (SSR via Next.js route)

Each procedure enforces input validation, session checks, and rate limiting as needed.

## 5. Hosting Solutions

**Primary Hosting**
- **Akash Network:** Decentralized cloud infrastructure using containerized deployments (via `akash-deploy.yml`)
- **Nginx Reverse Proxy:** Fronts both the Next.js frontend and Express API, handles SSL termination

**Benefits**
- **Reliability:** Multiple container replicas, health checks, automatic restarts
- **Scalability:** Horizontal scaling of API and web containers based on load
- **Cost-effectiveness:** Pay-as-you-use on Akash vs. fixed cloud VM costs

## 6. Infrastructure Components

**Load Balancer & Reverse Proxy**
- Nginx routes `/api` traffic to Express service, everything else to Next.js
- Session affinity disabled (stateless tRPC endpoints)

**Caching Mechanisms**
- **Redis:** Deployed as clustered primary/replica for high availability
- **Cache Patterns:** Read-through for leaderboard/sentiment, write-through for background refresh jobs

**Content Delivery Network (CDN)**
- Static assets from Next.js (images, JS bundles, OG images) served via a global CDN (e.g., Cloudflare)

**Service Workers & PWA**
- Next.js built-in service worker supports offline mode and scheduled push notifications

## 7. Security Measures

- **Authentication & Authorization**
  - Wallet-based login via RainbowKit/wagmi
  - tRPC middleware validates sessions on each request
- **Data Encryption**
  - TLS for all inbound/outbound traffic
  - Encryption at rest for PostgreSQL and Redis volumes
- **API Protection**
  - Rate limiting per IP and per user for critical endpoints
  - Input sanitization and server-side validation
- **Smart Contract Audit**
  - Professional audit of the ERC-721 contract before mainnet deployment

## 8. Monitoring and Maintenance

**Performance Monitoring**
- **Prometheus & Grafana:** Metrics exporters on API and Next.js containers (response times, error rates)
- **Redis Insight:** Monitors cache hit/miss ratios and memory usage

**Error Tracking**
- **Sentry:** Captures uncaught exceptions in frontend and backend

**Maintenance Strategies**
- **Scheduled Jobs:** Cron tasks to recompute network sentiment and refresh caches
- **Database Health Checks:** Automated alerts on replication lag, storage thresholds
- **Dependency Updates:** Dependabot or Renovate for regular library upgrades with CI tests

## 9. Conclusion and Overall Backend Summary

The "Vibe Check" backend is built for reliability, scalability, and rapid iteration. By leveraging a monorepo pattern, type-safe tRPC APIs, and a dual storage layer (PostgreSQL + Redis), it balances performance with maintainability. Containerized deployments on Akash, combined with Nginx, ensure high availability and cost efficiency. Security practices—from wallet-based authentication to rate limiting and smart contract audits—protect user data and platform integrity. Finally, robust monitoring and automated maintenance workflows keep the system healthy and responsive as the user base grows.

This architecture aligns with the project’s goals of delivering a seamless PWA experience, integrated Web3 features, and shareable Farcaster Frames, all while providing a solid foundation for future enhancements.