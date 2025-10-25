# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

The Lootlog team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### Where to Report

If you discover a security vulnerability, please report it by emailing:

**kamilwronka7@gmail.com**

### What to Include

To help us triage and fix the issue as quickly as possible, please include:

- Type of issue (e.g., SQL injection, XSS, authentication bypass, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: You will receive an acknowledgment within 48 hours
- **Status Updates**: We will keep you informed about the progress of the fix
- **Disclosure Timeline**: We aim to address critical vulnerabilities within 7 days
- **Credit**: We will credit you for the discovery (unless you prefer to remain anonymous)

### Security Update Process

1. Security vulnerability is received and assigned to a handler
2. The problem is confirmed and affected versions are identified
3. Code is audited to find similar potential problems
4. Fixes are prepared for all supported versions
5. Patches are released and security advisory is published

## Security Best Practices for Contributors

When contributing to Lootlog, please follow these security guidelines:

### Authentication & Authorization

- Never commit credentials, API keys, or secrets to the repository
- Use environment variables for sensitive configuration
- Implement proper JWT validation in all protected endpoints
- Follow the principle of least privilege for user permissions

### Database Security

- Use parameterized queries (Prisma ORM handles this automatically)
- Never construct SQL queries with string concatenation
- Validate and sanitize all user inputs
- Use proper database access controls

### API Security

- Validate all incoming request data with DTOs and validation pipes
- Implement rate limiting on public endpoints
- Use CORS properly to restrict origins
- Set appropriate security headers (helmet middleware)
- Never expose internal error details to clients in production

### Dependencies

- Keep dependencies up to date
- Review dependency updates for security advisories
- Use `pnpm audit` to check for known vulnerabilities
- Dependabot is configured to alert about vulnerable dependencies

### Environment Variables

- Never commit `.env` files to the repository
- Use `.env.sample` to document required environment variables
- Use strong random values for secrets and encryption keys
- Use `pnpm env:generate` to create secure defaults

### Discord Bot Security

- Validate all Discord webhook signatures
- Implement proper permission checks for bot commands
- Rate limit bot interactions
- Never expose bot tokens or webhook URLs

### Frontend Security

- Sanitize user-generated content before rendering
- Use Content Security Policy headers
- Validate all API responses
- Store JWT tokens securely (httpOnly cookies preferred over localStorage)

## Known Security Considerations

### Multi-Tenant Architecture

Lootlog uses a guild-based multi-tenant model. Contributors must ensure:

- Users can only access their own guild data
- Guild IDs are validated on every request
- Cross-guild data leakage is prevented

### Real-Time Features

Socket.IO connections require:

- Proper authentication before establishing connection
- Room-based access control
- Rate limiting on event emissions
- Validation of all incoming messages

### External Integrations

- Discord OAuth tokens are stored securely
- Margonem game client integration follows game ToS
- External API calls are properly rate-limited

## Security Tools

We use the following tools to maintain security:

- **Dependabot**: Automatic dependency vulnerability scanning
- **ESLint**: Static code analysis for security patterns
- **Prisma**: ORM with built-in SQL injection prevention
- **Better-Auth**: Secure authentication library
- **JWT + JWKS**: Secure token-based authentication
- **Helmet**: Security headers for Express/Fastify

## Disclosure Policy

- Security issues are fixed privately
- Public disclosure happens after a patch is available
- Security advisories are published on GitHub
- Critical vulnerabilities are announced to users via Discord/email

## Questions?

If you have any questions about this security policy, please contact:
kamilwronka7@gmail.com
