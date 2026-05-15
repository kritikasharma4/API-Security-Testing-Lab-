# Security Architecture

This document describes every security layer implemented in this API.

## 1. Password Hashing (bcryptjs)
- All passwords hashed with bcrypt, saltRounds=12
- Plaintext passwords never stored or logged
- Comparison done via `bcrypt.compare()` — timing-safe

## 2. JWT Authentication (jsonwebtoken)
- HS256 signed tokens, 1hr expiry
- Secret loaded from environment variable (never hardcoded)
- All protected routes verify token via middleware
- Tampered or expired tokens return 401 immediately

## 3. Rate Limiting (express-rate-limit)
- Login endpoint: 5 requests per 15 minutes per IP
- Global: 100 requests per 15 minutes per IP
- Returns 429 Too Many Requests when exceeded
- Spoofed IP headers (`X-Forwarded-For`) not trusted by default

## 4. Security Headers (helmet)
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `Content-Security-Policy` — restricts resource loading
- `X-XSS-Protection` — legacy XSS filter

## 5. CORS (cors)
- Only `http://localhost:3000` whitelisted
- All other origins blocked
- No wildcard (`*`) allowed

## 6. Input Validation (express-validator)
- All request bodies validated and sanitized
- Emails normalized, passwords length-checked
- Invalid input returns 400 with specific error messages
- Prevents injection payloads from reaching business logic

## 7. Error Handling
- Global error handler catches all unhandled errors
- Stack traces never exposed to clients
- Generic "Internal server error" message returned
- Specific business errors return appropriate status codes

## OWASP Top 10 Coverage
| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | JWT middleware on all protected routes |
| A02 Cryptographic Failures | bcrypt for passwords, JWT_SECRET from env |
| A03 Injection | express-validator sanitizes all input |
| A05 Security Misconfiguration | helmet sets secure headers |
| A07 Auth Failures | Rate limiting, bcrypt, JWT expiry |
