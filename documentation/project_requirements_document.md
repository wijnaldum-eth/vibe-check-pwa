# Project Requirements Document (PRD)

**Project Name:** Vibe Check PWA\
**Version:** 1.0\
**Date:** 2024-06

## 1. Project Overview

Vibe Check is a Progressive Web App (PWA) that lets crypto users track their daily sentiment (or “vibes”) on a simple one-tap scale. By connecting their Ethereum-compatible wallet, users can log how they feel each day, view historical charts of their mood trends, and compete in a global consistency leaderboard. The app also generates a shareable image (an Open Graph card) optimized for Farcaster Frames and issues ERC-721 NFT badges on Base L2 when users hit streak milestones.

We’re building Vibe Check to solve two core problems: (1) crypto traders have anecdotally recognized that sentiment drives behavior, yet there’s no standard tool for tracking personal mood streaks and social sentiment; (2) Web3 communities thrive on shareable on-chain achievements. Our key success criteria are: smooth wallet-based onboarding with RainbowKit, reliable streak calculation and leaderboards, robust PWA install/offline support (90+ Lighthouse score), and secure NFT minting integration on Base via Alchemy.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)

*   Wallet-based authentication using RainbowKit & wagmi
*   Daily mood logging screen (one-tap input)
*   Streak calculation and display (current and longest streak)
*   Historical mood chart (via Recharts)
*   Global consistency leaderboard (cached in Redis)
*   Network sentiment pulled from the Neynar API
*   Dynamic OG image generation route for Farcaster Frames
*   ERC-721 NFT badge minting endpoint using Alchemy SDK on Base
*   Core PWA features: service worker, web manifest, offline fallback
*   Docker Compose for local dev (web, api, PostgreSQL, Redis)

### Out-of-Scope (Planned for Later Phases)

*   Push notification delivery and scheduling
*   Multi-language/locale support
*   Admin dashboard for manual badge issuance or user management
*   Detailed user profiles beyond wallet address
*   Advanced analytics or ML-driven sentiment predictions
*   Full CI/CD pipeline automation (GitHub Actions will be stubbed)
*   Third-party integrations beyond Neynar and Alchemy

## 3. User Flow

A new user lands on the PWA’s splash screen and is prompted to connect their Ethereum wallet via RainbowKit. Once connected, they’re routed to the Mood Entry page, where they tap one of five mood icons (e.g., 🙃, 🙂, 😊, 😎, 🔥). Tapping sends the mood and timestamp via a tRPC call to the Express API, which stores it in PostgreSQL and updates the streak in Redis. The user sees an animation confirming their mood is logged.

After logging, the user is redirected to their Dashboard. The top of the page shows their current streak and longest streak in a Card component. Below, an interactive Recharts graph displays their mood history for the past 30 days. A DataTable shows the global consistency leaderboard, refreshed from Redis. A button lets the user “Share to Farcaster,” which hits the OG image route to generate a shareable graphic. When the user hits a milestone (e.g., 7-day streak), the backend queues an NFT mint via the Alchemy SDK and notifies them on next load.

## 4. Core Features

*   **Wallet-Based Authentication**: Connect via RainbowKit & wagmi, store wallet address as user ID.
*   **Mood Logging**: One-tap mood input, server-side timestamping, persist to PostgreSQL.
*   **Streak Tracking**: Calculate daily streaks, update in Redis for fast reads.
*   **Historical Mood Chart**: Interactive 30-day mood trend using Recharts.
*   **Global Leaderboard**: Show top 100 users by longest streak, cached in Redis.
*   **Network Sentiment**: Fetch Farcaster social graph via Neynar API, compute aggregate mood.
*   **Farcaster OG Image**: Next.js dynamic route generating PNG/SVG for sharing.
*   **ERC-721 Badge Minting**: Foundry smart contract, Express endpoint, Alchemy SDK integration.
*   **PWA Fundamentals**: Service worker, web manifest, install prompt, offline fallback page.
*   **Containerized Dev**: Dockerfiles + docker-compose for web, api, PostgreSQL, Redis.

## 5. Tech Stack & Tools

*   **Monorepo**: pnpm Workspaces
*   **Frontend (apps/web)**: Next.js 15 (App Router), TypeScript, React, shadcn/ui, Tailwind CSS, Recharts, RainbowKit, wagmi
*   **Backend (apps/api)**: Node.js, Express.js, tRPC, TypeScript, Drizzle ORM
*   **Database**: PostgreSQL (primary), Redis (cache)
*   **Smart Contracts**: Foundry (contracts/ folder), Solidity ERC-721
*   **Web3 SDKs**: Alchemy SDK for Base L2, Neynar API for Farcaster data
*   **Containerization**: Docker, docker-compose
*   **Deployment**: Akash SDL (`akash-deploy.yml`), Nginx reverse proxy
*   **CI/CD (stub)**: GitHub Actions
*   **IDE & Plugins**: VS Code with ESLint, Prettier, tRPC/TypeScript support (optional Cursor plugin)

## 6. Non-Functional Requirements

*   **Performance:**

    *   < 200ms API response for mood log & streak endpoints
    *   < 1s cold load for main dashboard page
    *   Lighthouse PWA score ≥ 90

*   **Security:**

    *   Input validation on all tRPC procedures
    *   Rate limiting (e.g., 60 requests/min) on external-facing endpoints
    *   ERC-721 contract audit before mainnet deployment

*   **Compliance:**

    *   GDPR-style data model: only wallet address + mood logs, no PII

*   **Usability:**

    *   Dark-mode first UI, accessible color contrast (WCAG AA)
    *   Mobile-first responsive design, installable on iOS & Android

## 7. Constraints & Assumptions

*   **Dependencies:**

    *   Alchemy SDK access to Base L2
    *   Neynar API key for Farcaster social graph
    *   Redis availability for caching layer

*   **Assumptions:**

    *   Users have Ethereum-compatible wallets (MetaMask, WalletConnect)
    *   Base L2 and Farcaster APIs remain stable during MVP
    *   PNPM and Docker are standard dev tools for the team

## 8. Known Issues & Potential Pitfalls

*   **API Rate Limits:** Alchemy and Neynar impose rate caps; implement retries with backoff.
*   **Monorepo Complexity:** Ensure correct cross-package TypeScript path mapping; update CI to install all workspaces.
*   **Caching Staleness:** Redis cache might serve slightly out-of-date leaderboard; set TTL (e.g., 60s) and invalidate on major events.
*   **Cross-Origin OG Generation:** Nginx must allow appropriate CORS headers for dynamic image routes.
*   **Smart Contract Gas Fees:** Consider gas margin in minting logic; notify users of on-chain delays.

This PRD provides a clear blueprint for Vibe Check’s initial release, detailing scope, user journey, core features, tech stack, and potential risks. Subsequent documents (Tech Stack Specification, Frontend Guidelines, Backend Structure, App Flow Diagram, File Structure, IDE Rules) can directly reference this document to avoid ambiguity and keep development aligned with project goals.
