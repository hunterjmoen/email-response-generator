# Technical Assumptions

## Repository Structure: Monorepo

Single repository containing frontend and backend packages with shared TypeScript types and utilities, enabling efficient development and deployment coordination while maintaining clear separation of concerns.

## Service Architecture

**API-First Monolith with Microservice Readiness:** Initial monolithic API design that enables future mobile app development while maintaining development simplicity. Core services (AI processing, user management, response generation) are architecturally separated to allow future microservices migration as scale demands.

**Rationale:** Bootstrap budget constraints favor monolith development speed while API-first design ensures platform expansion capability. Microservice patterns are designed-in but not implemented until scale justifies operational complexity.

## Testing Requirements

**Unit + Integration Testing:** Comprehensive unit testing for business logic with integration testing for AI API interactions and user workflows. Manual testing convenience methods for response quality validation since AI output requires human evaluation.

**Rationale:** AI-generated content requires human quality assessment that automated testing cannot fully capture, necessitating manual testing infrastructure alongside traditional automated testing approaches.

## Additional Technical Assumptions and Requests

**Frontend Stack:**
- React.js with TypeScript for type safety and component-based architecture
- Tailwind CSS for rapid responsive design development
- Deployed on Vercel or Netlify for optimal static asset performance

**Backend Stack:**
- Node.js with Express/Fastify API framework using TypeScript
- PostgreSQL for user profiles and application data
- Redis for session management and response caching

**External Integrations:**
- OpenAI API for AI response generation (single AI provider dependency)
- Stripe for payment processing and subscription management
- Email service (SendGrid/AWS SES) for user notifications

**Infrastructure & Hosting:**
- AWS or Google Cloud Platform with auto-scaling capabilities
- CDN integration for static asset delivery
- HTTPS enforcement and JWT authentication

**Development & Deployment:**
- CI/CD pipeline with automated testing and deployment
- Environment separation (development, staging, production)
- Database migration management for schema evolution
