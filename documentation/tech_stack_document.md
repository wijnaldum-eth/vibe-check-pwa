# Tech Stack Document for Vibe Check PWA

This document explains the technology choices behind the Vibe Check Progressive Web App (PWA) in everyday language. It covers how each piece of the stack works together to deliver a fast, reliable, and user-friendly crypto sentiment tracker.

## 1. Frontend Technologies
These are the tools and libraries that shape what you see and interact with in your browser or on your phone.

- **Next.js (App Router)**
  • A popular framework for building React applications. It handles page routing, server-side rendering, and optimizes for speed.  
  • Enables the PWA features (offline support, fast load times) out of the box.

- **Progressive Web App Features**
  • **Service Workers**: Scripts that run in the background to cache assets and enable offline usage.  
  • **Web Manifest**: A simple JSON file that makes the app installable on mobile devices.

- **UI Library & Styling**
  • **shadcn/ui**: A collection of ready-to-use user interface components (buttons, cards, dialogs) that speed up development.  
  • **Tailwind CSS**: A utility-first CSS framework for quickly styling components and applying a consistent dark-mode-first design.

- **Charting**
  • **Recharts**: A chart library built on React to visualize your mood trends with simple line and area charts.

- **Wallet Connection**
  • **RainbowKit** and **wagmi**: Easy-to-use packages that let users sign in with their Ethereum-compatible wallets (Metamask, WalletConnect, etc.) instead of passwords.

## 2. Backend Technologies
These components handle data storage, business logic, and communication with external services behind the scenes.

- **Monorepo with pnpm Workspaces**
  • Organizes related code in one repository but across separate packages:  
    - `apps/web` (Next.js frontend)  
    - `apps/api` (Express + tRPC backend)  
    - `contracts` (smart contract code)  
    - `packages/shared` (common TypeScript types)

- **Express.js**
  • A lightweight web server framework for Node.js that handles incoming requests and routes them to the right code.

- **tRPC**
  • Builds a type-safe API layer between frontend and backend. It ensures that both sides share the same data definitions, reducing errors.

- **PostgreSQL (with Drizzle ORM)**
  • A reliable relational database to store user profiles (by wallet address), daily mood logs, and streak information.  
  • Drizzle ORM provides a simple, typed interface to read and write data.

- **Redis Cache**
  • An in-memory data store used to speed up frequent reads, such as the global consistency leaderboard and aggregated network sentiment.

## 3. Infrastructure and Deployment
These choices ensure the app is easy to run, scales well, and stays up-to-date automatically.

- **Containerization**
  • **Docker** and **docker-compose**: Package the frontend, backend, database, and cache into isolated containers that run the same way on any machine.

- **Version Control**
  • **Git** (hosted on GitHub): Tracks code changes and supports collaboration.

- **Continuous Integration / Continuous Deployment (CI/CD)**
  • **GitHub Actions**: Automates testing and deployment whenever code is pushed or merged.  
  • **Akash SDL (`akash-deploy.yml`)**: Defines how the services should run in a production environment on the Akash network.

- **Reverse Proxy**
  • **Nginx**: Routes incoming web traffic to the correct container (frontend or backend) and handles SSL termination.

## 4. Third-Party Integrations
These external services extend core functionality without building everything from scratch.

- **Alchemy SDK**
  • Connects to the Base L2 network to mint ERC-721 NFT badges when users hit mood streak milestones.

- **Neynar API**
  • Fetches a user’s Farcaster social graph to calculate and display network sentiment in real time.

- **Farcaster Frames**
  • Generates customized Open Graph images on the fly for each user’s mood and streak. These images are shareable in Farcaster posts.

## 5. Security and Performance Considerations
This section outlines the measures taken to protect user data and keep the app running smoothly.

- **Authentication & Data Protection**
  • Wallet-based login eliminates passwords and ties identity directly to on-chain addresses.  
  • All inputs are validated on the server side to prevent malicious requests.  
  • Rate limiting on key API endpoints to guard against abuse.

- **Smart Contract Audit**
  • Before deploying the ERC-721 badge contract to the Base mainnet, a professional audit will ensure there are no security vulnerabilities.

- **Caching & Load Optimization**
  • Redis cache reduces load on PostgreSQL for high-read operations (leaderboards, network stats).  
  • Service workers cache static assets, cutting down load times and enabling offline use.

- **Testing Strategy**
  • **Unit tests** for UI components and smart contract logic.  
  • **Integration tests** for tRPC endpoints and database workflows.  
  • **Lighthouse audits** for PWA installability, performance, and accessibility.

## 6. Conclusion and Overall Tech Stack Summary
Vibe Check’s stack brings together modern, battle-tested tools that work in harmony to deliver a seamless user experience:

- A responsive, installable PWA powered by Next.js, service workers, and a dark-mode theme.  
- Wallet-based authentication with RainbowKit and wagmi for secure, password-free logins.  
- A type-safe, monorepo architecture (Express + tRPC) ensuring consistent data models across frontend and backend.  
- Reliable data storage with PostgreSQL (Drizzle ORM) plus Redis caching for fast access to popular data.  
- Web3 integrations via Alchemy and Foundry for NFT badge minting, and flexible Farcaster Frames support for shareable visuals.  
- Containerized development (Docker) and automated CI/CD pipelines (GitHub Actions + Akash) for reliable builds and deployments.

This combination of technologies aligns perfectly with the project’s goals: providing a fast, secure, and engaging daily crypto sentiment tracker that users can install like an app and interact with on any device.