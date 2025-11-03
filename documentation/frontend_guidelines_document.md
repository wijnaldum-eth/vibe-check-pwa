# Frontend Guideline Document for Vibe Check PWA

This document outlines the frontend architecture, design principles, styling, component structure, state management, routing, performance optimizations, testing, and overall guidelines for building and maintaining the Vibe Check Progressive Web App (PWA). It is written in plain language so anyone on the team can understand how the frontend is set up and why we chose each part.

## 1. Frontend Architecture

### Overall Structure
- We use a **pnpm monorepo**. Inside, the frontend lives in `apps/web`. Other packages include:
  - `apps/api` (Express + tRPC backend)
  - `packages/shared` (shared TypeScript types)
- The web app is built with **Next.js (App Router)** and **TypeScript**.
- UI components come from **shadcn/ui** and utilities from **Tailwind CSS**.
- We add PWA support through service workers and a web manifest for offline use and installability.

### How It Supports Scalability, Maintainability, Performance
- **Modular code**: splitting frontend, backend, and shared types makes each part easier to update or replace.
- **Component-based** architecture (React + shadcn/ui) means UI pieces are reusable and tested independently.
- **Next.js App Router** lets us use server components where they make sense and client components only when needed, reducing bundle size and boosting performance.
- **TypeScript + tRPC** provides end-to-end type safety: the shape of data from the database up to the UI is guaranteed, cutting down bugs.
- **Tailwind CSS** with purging removes unused CSS, keeping stylesheets small.
- **PWA features** (service worker caching, fast loading) improve perceived performance on repeat visits.

## 2. Design Principles

### Key Principles
1. **Usability**: simple, one-tap mood input, clear calls to action, and intuitive navigation.
2. **Accessibility**: keyboard-friendly, proper ARIA labels, sufficient color contrast, and meaningful alt text.
3. **Responsiveness**: mobile-first design that scales smoothly from small phones to large desktops.
4. **Consistency**: shared UI components and theme tokens ensure a uniform look and feel.
5. **Trust & Security**: transparent wallet-based login flows and clear feedback on transactions.

### Applying These Principles
- Buttons and inputs follow established size and spacing guidelines so they’re easy to use on touch screens.
- All interactive elements have focus states and labels for screen readers.
- Layouts adapt via Tailwind’s responsive utilities (`sm:`, `md:`, `lg:`). Charts and tables shrink or scroll gracefully.
- The dark-mode-first theme ensures the app is comfortable in low-light settings and respects user preference.

## 3. Styling and Theming

### Styling Approach
- We use a **utility-first** approach with **Tailwind CSS** and custom shadcn/ui components.
- No BEM or SMACSS – Tailwind classes live alongside components, and design tokens (colors, spacing) are centralized.
- **Preprocessor**: PostCSS is configured for Tailwind; no additional SASS or LESS.

### Theming
- Theme toggles between light and dark modes by switching CSS variables.
- Brand color is **#0052FF** (Base’s primary blue). Accent and neutrals derive from this.

### Visual Style
- Modern flat design with subtle **glassmorphism** touches on cards and modals (backdrop blur + semi-transparent backgrounds).
- Focus on clean typography and plenty of white (or dark) space around interactive elements.

### Color Palette
- Primary Blue: #0052FF
- Secondary Cyan: #00D4FF
- Dark Background: #121212
- Light Background: #FFFFFF
- Text Primary: #E0E0E0 (dark mode) / #333333 (light mode)
- Accent: #FFD600 (for highlights and notifications)

### Typography
- Base font: **Inter**, a modern, legible sans-serif.
- Headings: 700 weight; body text: 400 weight; rely on responsive type sizing via Tailwind.

## 4. Component Structure

### Organization
- All UI primitives (buttons, cards, dialogs) live in `apps/web/components/ui`.
- Feature components (mood input, charts, leaderboard) live in `apps/web/components/features`.
- Page layouts and global wrappers in `apps/web/app/layout.tsx` and per-route folders under `apps/web/app/`.

### Reuse and Maintainability
- Each component has a single responsibility and clear props interface.
- Shared types and helpers in `packages/shared` avoid duplicating interfaces between frontend and backend.
- Changes to a UI primitive propagate across all features, ensuring consistent styling.

## 5. State Management

### Local State
- React’s built-in hooks (`useState`, `useReducer`) manage local form or UI state within components.

### Global & Server State
- **tRPC + React Query** handles data fetching and caching for remote data (mood logs, streaks, leaderboard).
- **wagmi hooks** manage wallet connection state (connected address, network status).
- **Context API** is used sparingly for cross-cutting concerns like theme or notification banners.

## 6. Routing and Navigation

### Routing
- **Next.js App Router**: filesystem-based routing in `apps/web/app/`.
- Dynamic routes for pages like `/dashboard`, `/settings`, and a special `/frames/[address].png` for OG image generation.

### Navigation
- A responsive navbar with wallet connect button (via RainbowKit) at the top.
- Sidebar or bottom nav (mobile) for switching between Mood Input, Dashboard, Leaderboard, and Settings.
- We use `next/link` for client-side transitions and preserve scroll position.

## 7. Performance Optimization

### Code Splitting & Lazy Loading
- Next.js automatically splits code per route. We also use dynamic `import()` for heavy chart components.

### Asset Optimization
- `next/image` for responsive, optimized images and auto-format selection (WebP).
- Tailwind’s JIT mode and purge to keep CSS under 50KB.

### Caching & PWA
- Service worker caches static assets and API responses for offline mode.
- Redis on the backend caches leaderboard data; tRPC cache sticks around between navigations.

### Server Components
- Leverage Next.js server components where data doesn’t change often to reduce client JS.

## 8. Testing and Quality Assurance

### Unit Tests
- **Jest** + **React Testing Library** for React components and utility functions.
- Focus on mood input logic, wallet-connect flows, and UI primitives.

### Integration Tests
- Test tRPC endpoints in `apps/api` against a test database (PostgreSQL). Verify mood logging, streak calculations, and leaderboard queries.

### End-to-End Tests
- **Cypress** scripts to simulate full user flows: connect wallet, log mood, view streak, claim NFT badge.

### PWA & Performance Audits
- **Lighthouse** for PWA metrics: performance, accessibility, best practices, SEO.

### Security & Linting
- **ESLint** with TypeScript rules and **Prettier** for consistent code style.
- Rate limiting middleware on API, input validation even though tRPC types guard shapes.

## 9. Conclusion and Overall Frontend Summary

Vibe Check’s frontend is built for scalability, reliability, and a great user experience. We rely on a modern Next.js PWA foundation, type-safe data flows with tRPC, and a utility-first styling approach. Our design principles of usability, accessibility, and responsiveness guide every screen. The monorepo structure and shared types keep the code organized, while testing and performance optimizations ensure a smooth, secure, and fast app. Unique aspects like Farcaster Frame OG generation, wallet-based authentication, and Web3 NFT badge issuance set Vibe Check apart, delivering a one-of-a-kind crypto sentiment tracker.

By following these guidelines, any developer or designer joining the project will know exactly how to build, style, and maintain the frontend in alignment with our goals and standards.