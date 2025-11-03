# Vibe Check PWA: Security Guideline Document

This document defines security best practices and requirements tailored for the **Vibe Check** Progressive Web App (PWA), a crypto sentiment tracker built with a Next.js frontend, Express/tRPC backend, PostgreSQL, Redis cache, and smart-contract integration on Base L2. It aligns with core security principles—security by design, defense in depth, and least privilege—to ensure a robust, trustworthy application.

---

## 1. Security by Design & Secure Defaults

• Embed security from project inception: include threat modeling for Web3 flows, Farcaster integration, and NFT minting.

• Adopt secure defaults:
  - HTTPS/TLS 1.2+ enforced everywhere.
  - `NODE_ENV=production` in production; disable debug/log verbose output.
  - Strong Content Security Policy, e.g.:  
    ```
    Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:;
    ```

• Defense in depth: combine network, application, and data-layer controls.

---

## 2. Authentication & Access Control

### 2.1 Wallet-Based Authentication

• Integrate RainbowKit/wagmi for Ethereum wallet login; avoid email/password wherever possible.

• Enforce on-chain signature challenge flows:
  - Issue a random nonce per login attempt.
  - Verify signed message server-side before creating a session.

### 2.2 Session Management & RBAC

• Implement stateless JWT or signed session cookies with:
  - `HttpOnly`, `Secure`, and `SameSite=Strict` flags.
  - Short-lived tokens (e.g., 15 min) + refresh tokens with rotation and revocation lists.

• Define roles (e.g., user, admin, auditor) in shared TypeScript types (`packages/shared`) and enforce server-side in every tRPC procedure.

• Protect tRPC endpoints with middleware that validates wallet address and role claims.

### 2.3 Rate Limiting & Throttling

• Apply per-IP and per-wallet rate limiting on sensitive endpoints (login, mood logging, NFT minting) using libraries like `express-rate-limit` or Redis-based limiter.

---

## 3. Input Validation & Output Encoding

• Treat all inputs—including JSON bodies, query params, headers—as untrusted. Use `zod` schemas in tRPC to:
  - Validate shape, type, length, formats (e.g., ISO dates, numeric mood values).
  - Enforce whitelist for redirect URLs, Farcaster handles, and external API parameters.

• Sanitize outputs rendered in the Next.js frontend:
  - Use `next/image` for user-supplied image URLs.
  - Context-aware encoding in React (`{value}` escapes by default).

• Prevent injection:
  - Use parameterized queries via Drizzle ORM for PostgreSQL.
  - No string concatenation for SQL or Redis commands.

---

## 4. Data Protection & Privacy

### 4.1 Encryption In Transit & At Rest

• Enforce HTTPS/TLS 1.2+ for all web and API traffic.

• Enable encryption at rest for PostgreSQL and Redis (via cloud provider settings).

### 4.2 Secrets Management

• Do not hardcode private keys, DB credentials, or Alchemy keys. Use:
  - **HashiCorp Vault**, **AWS Secrets Manager**, or encrypted environment variables in CI.

• Limit secret access by service account and rotate keys periodically.

### 4.3 Minimizing Data Exposure

• Log only metadata (timestamp, event type) without PII or on-chain signatures.

• Mask or truncate wallet addresses if displayed in logs or analytics.

---

## 5. API & Service Security

• Enforce HTTPS and HSTS headers.

• Use strict CORS policy:
  - `Access-Control-Allow-Origin` limited to your domains and Frames origin.
  - `Access-Control-Allow-Methods` to specific verbs.

• Version your API (e.g., `/trpc/v1/...`) to manage breaking changes.

• Minimize payloads: do not expose raw database entities; use DTOs in tRPC to return only required fields.

---

## 6. Web Application Security Hygiene

• CSRF Protection: No traditional cookies for auth if using JWT in `Authorization` header. If cookies used, implement `csrf` tokens for state-changing Next.js API calls.

• Security Headers:
  - `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.

• SRI for third-party scripts (e.g., CDN assets).

• Avoid localStorage for sensitive data; keep tokens in secure cookies or in-memory store.

---

## 7. Infrastructure & Configuration Management

• Container Hardening:
  - Use minimal base images (e.g., Alpine variants).
  - Drop unnecessary Linux capabilities; run as non-root.

• Network:
  - Only expose ports 80/443 publicly; restrict API service and DB to internal network or VPN.

• Automate patching of servers and containers; scan images for vulnerabilities (using tools like Trivy).

• Disable debug endpoints and verbose logs in production.

---

## 8. Dependency & Build Management

• Maintain `pnpm-lock.yaml` in version control.

• Regularly run SCA scans (e.g., GitHub Dependabot, Snyk) and update vulnerable packages promptly.

• Limit dependencies to actively maintained, well-audited libraries (Drizzle ORM, Express, Next.js, Foundry).

---

## 9. Smart Contract Security

• Solidity best practices:
  - Use latest Solidity compiler (>=0.8.x) with optimizer settings.
  - Avoid loops over unbounded dynamic arrays.
  - Validate input thoroughly on-chain and off-chain.

• Professional audit for the ERC-721 badge contract before mainnet deployment.

• Use test and staging networks (Goerli, Base testnet) and fuzz testing via Foundry’s `forge test`.

---

## 10. Testing, Monitoring & Incident Response

• Automated tests:
  - Unit tests for React components (mood input, chart rendering).
  - Integration tests for tRPC procedures (using a Dockerized test DB).
  - End-to-end tests (Cypress) for user flows: wallet connect, mood logging, leaderboard.

• Continuous Monitoring & Logging:
  - Centralize logs with ELK/Datadog; alert on error rates and suspicious activity.
  - Monitor smart-contract events (e.g., NFT mint failures).

• Incident Response:
  - Define process for key compromise: revoke API keys, rotate secrets, notify users.
  - Regularly review and update runbooks.

---

## Conclusion

Adhering to these guidelines will build a secure foundation for the **Vibe Check** PWA, protecting user data, blockchain interactions, and infrastructure. Security is an ongoing effort: continuously review, test, and refine controls as the application evolves.