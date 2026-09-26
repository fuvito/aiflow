# AiFlow — Private Public Demo Deployment

## Objective

Deploy AiFlow to a publicly accessible server so that recruiters, engineering managers, founders, and selected technical users can see and evaluate the application.

**Important:** AiFlow must NOT be an open public application.

The public should be able to visit the landing page and learn about AiFlow, but actual application usage must require authentication and controlled access.

The primary purpose of this deployment is **portfolio presentation, job search, technical evaluation, and gathering feedback from selected users** — not public SaaS launch.

---

# 1. Desired User Experience

The application should have three levels of access.

## A. Public Visitor

Anyone can access:

* Landing page
* AiFlow description
* Screenshots / product overview
* Architecture overview
* Medium article
* GitHub repository
* Short demo video
* Request Access page

Public visitors should NOT be able to use the actual AiFlow application.

Example CTA:

> **Request Access**

---

## B. Demo User

A controlled demo account may be provided to selected visitors.

Demo users can:

* Login
* Explore AiFlow
* Open predefined example workflows
* View workflow structure
* Run limited simulations/executions
* View execution traces
* Explore AI-assisted workflow functionality where appropriate

Demo users must have reasonable usage limits.

The demo account must NOT have access to:

* Application administration
* User management
* Server configuration
* Environment variables
* Other users' data
* Production secrets
* Unlimited LLM/API usage
* Billing configuration

---

## C. Approved Private User

Users explicitly approved by the owner can access the full application.

Access should be controlled through authentication and an allowlist/approval mechanism.

The owner should be able to:

* Approve a user
* Disable a user
* Change user role
* Identify demo vs approved user
* Remove access

---

# 2. Recommended Architecture

Use the existing AiFlow technology stack wherever possible.

Expected architecture:

```text
                    Internet
                       |
                       v
              +------------------+
              |   Public Web App |
              | React / Vite     |
              +------------------+
                       |
             +---------+---------+
             |                   |
             v                   v
      Public Landing       Authentication
                               |
                               v
                         Supabase Auth
                               |
                         Access Control
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
            Demo User                 Approved User
                 |                           |
                 +-------------+-------------+
                               |
                               v
                         AiFlow Frontend
                               |
                               v
                         FastAPI Backend
                               |
             +-----------------+------------------+
             |                 |                  |
             v                 v                  v
         Supabase DB       LLM Provider       Other APIs
```

Do not introduce unnecessary infrastructure.

Prefer the simplest architecture that provides secure access control.

---

# 3. Authentication

Use the existing Supabase authentication infrastructure if already implemented.

Preferred authentication:

* Email/password OR
* Magic link

Do not build custom authentication.

Authentication must happen before access to the actual application.

Unauthenticated users should be redirected to the public landing page or login page.

---

# 4. Authorization

Authentication alone is not sufficient.

A user must have an application access status.

Suggested user states:

```text
PENDING
APPROVED
DEMO
DISABLED
```

Example:

```text
User
----
id
email
access_status
role
created_at
updated_at
```

Possible roles:

```text
USER
DEMO
ADMIN
```

Keep the authorization model simple.

Do not build a complicated RBAC system unless the existing application already requires it.

---

# 5. Access Rules

## Public

```text
/                  -> Landing page
/about             -> Public information
/demo              -> Demo information/video
/request-access    -> Request access
/login             -> Login
```

## Authenticated

```text
/app
/app/workflows
/app/workflows/:id
/app/execution/:id
/app/settings
```

The exact routes should follow the existing AiFlow application structure.

---

# 6. Request Access

Create a simple request-access form.

Fields:

* Name
* Email
* Optional LinkedIn URL
* Optional Company
* Optional message

Example:

> I'm interested in exploring AiFlow and would like access to the demo.

The request should be stored in a database or otherwise made available to the owner.

The system should NOT automatically grant application access.

Default flow:

```text
Visitor
   |
   v
Request Access
   |
   v
PENDING
   |
   v
Owner reviews request
   |
   +----> Reject / Ignore
   |
   +----> Approve
              |
              v
          APPROVED
```

---

# 7. Demo Mode

Create a controlled demo mode.

The goal is to allow someone to understand the product without allowing unlimited resource consumption.

Demo restrictions may include:

* Limited number of workflow executions per day
* Limited number of LLM requests
* Predefined example workflows
* Restricted workflow editing if necessary
* Restricted external integrations
* No access to administrative functionality

The exact limits should be configurable.

For example:

```text
DEMO_MAX_EXECUTIONS_PER_DAY=10
DEMO_MAX_LLM_REQUESTS_PER_DAY=20
```

Do not hard-code these limits throughout the application.

---

# 8. Protect API Keys and Secrets

This is critical.

No LLM provider API keys or other secrets may be exposed to the browser.

Never put secrets in:

```text
VITE_*
NEXT_PUBLIC_*
React source code
frontend configuration
```

The browser should communicate with the FastAPI backend.

The backend should make calls to:

* OpenAI
* Gemini
* other LLM providers
* external services

using server-side environment variables.

Example:

```text
OPENAI_API_KEY
GOOGLE_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

These must remain server-side.

Never commit `.env` files or secrets to GitHub.

---

# 9. Database Security

If Supabase/Postgres is used, enable and properly configure Row Level Security where appropriate.

Users must only be able to access their own data.

For example:

```text
User A
  |
  +--> Workflow A
  +--> Execution A

User B
  |
  +--> Workflow B
  +--> Execution B
```

User A must never be able to query User B's workflows or executions by manipulating IDs.

Do not rely only on frontend restrictions.

Authorization must also be enforced by the backend/database.

---

# 10. Admin Access

Create a simple admin mechanism.

The owner should be able to see:

```text
User
Email
Access Status
Role
Created
Last Login
```

And perform:

```text
Approve
Disable
Change Role
```

Do not build a sophisticated administration dashboard unless it is trivial with the existing architecture.

A simple protected admin page is sufficient.

---

# 11. Demo Data

Create several polished example workflows.

These should allow a visitor to understand AiFlow immediately.

Suggested examples:

### Example 1 — Customer Review Analysis

```text
Input Reviews
      |
      v
Sentiment Analysis
      |
      v
Extract Issues
      |
      v
Generate Summary
      |
      v
Human Review
```

### Example 2 — Customer Support Agent

```text
User Question
      |
      v
Classify Request
      |
      v
Retrieve Knowledge
      |
      v
Generate Response
      |
      v
Human Approval
```

### Example 3 — Document Analysis

```text
Document
   |
   v
Extract Information
   |
   v
Analyze
   |
   v
Validate
   |
   v
Generate Report
```

These examples should be safe and should not require the visitor to provide API keys.

---

# 12. Landing Page

The landing page should clearly communicate:

## What is AiFlow?

A visual development environment for designing, simulating, evaluating, and understanding agentic AI workflows.

Suggested sections:

1. Hero
2. What problem AiFlow solves
3. Visual workflow example
4. Describe → Generate → Design → Simulate → Evaluate
5. Architecture
6. Technology
7. Screenshots
8. Demo video
9. Medium article
10. GitHub
11. Request Access

Primary CTA:

> **Request Demo Access**

Secondary CTA:

> **Read the Technical Article**

---

# 13. Do Not Make the Landing Page Look Like a Commercial SaaS

AiFlow is currently primarily a technical project / portfolio / research project.

Avoid pretending that this is already a mature commercial SaaS product.

The messaging should be:

> Built as an exploration of developer tooling for agentic AI workflows.

This is more credible.

---

# 14. Analytics

Add lightweight analytics if practical.

Track:

* Landing page visits
* Request-access submissions
* Login
* Demo usage
* Workflow execution count

Do not collect unnecessary personal information.

The primary purpose is understanding whether people are interested.

---

# 15. Rate Limiting

The backend must have basic rate limiting.

At minimum protect:

* Login-related endpoints
* Request-access endpoint
* LLM endpoints
* Workflow execution endpoints

The exact implementation should use the existing infrastructure where possible.

Do not introduce a complicated distributed rate-limiting system for the MVP.

---

# 16. Cost Protection

This deployment is not intended to be an unrestricted public AI playground.

The implementation must prevent unexpected API costs.

Implement:

* Per-user execution limits
* Demo limits
* LLM request limits
* Maximum workflow execution duration
* Maximum workflow nodes where appropriate
* Request timeout
* Backend error handling

If possible, expose usage information to the user.

Example:

```text
Demo Usage

Executions today: 3 / 10
AI requests today: 7 / 20
```

---

# 17. Security Requirements

Before deployment verify:

* No secrets in frontend
* No secrets committed to Git
* Supabase RLS configured
* Backend validates authenticated users
* Backend validates authorization
* User IDs cannot be spoofed
* Admin routes are protected
* Demo restrictions are enforced server-side
* API endpoints have reasonable rate limits
* LLM endpoints have usage limits
* CORS is restricted appropriately
* Production environment variables are configured securely
* Debug mode is disabled in production
* Sensitive errors are not returned to users
* Database credentials are not exposed

---

# 18. Deployment

Use the simplest hosting architecture compatible with the existing project.

Preferred possibilities:

Frontend:

* Vercel
* AWS Amplify
* existing hosting

Backend:

* Existing AWS/FastAPI deployment
* Render
* Railway
* Fly.io
* another appropriate low-cost service

Database/Auth:

* Existing Supabase project

Do NOT migrate technologies merely for this deployment.

First inspect the current project and reuse the existing infrastructure.

---

# 19. Domain

If a dedicated AiFlow domain is already available, use it.

Otherwise a subdomain is acceptable.

Example:

```text
aiflow.example.com
```

or:

```text
aiflow.<personal-domain>.com
```

The URL should be professional enough to share on:

* LinkedIn
* Medium
* resume
* GitHub
* job applications

---

# 20. Development Approach

Before making changes:

1. Inspect the existing AiFlow repository.
2. Understand the current frontend architecture.
3. Understand the current FastAPI backend.
4. Identify existing Supabase integration.
5. Identify existing authentication.
6. Identify existing workflow/execution models.
7. Identify existing environment variables.
8. Identify current deployment configuration.

Do not rewrite working components unnecessarily.

Implement the smallest set of changes needed to achieve:

**Public landing page + authenticated private application + controlled demo access + admin approval.**

---

# 21. Suggested Implementation Order

### Phase 1 — Authentication

* Verify Supabase Auth
* Add login/logout
* Protect application routes
* Add session handling

### Phase 2 — Access Control

* Add user access status
* Add roles
* Add backend authorization
* Add admin approval

### Phase 3 — Request Access

* Create request form
* Store request
* Notify/admin visibility
* Approval workflow

### Phase 4 — Demo Mode

* Create demo user/role
* Add usage limits
* Add demo workflows
* Restrict expensive operations

### Phase 5 — Security

* API key protection
* RLS
* CORS
* rate limiting
* backend authorization
* cost controls

### Phase 6 — Landing Page

* Product explanation
* Screenshots
* Demo video
* Medium article
* GitHub
* Request Access CTA

### Phase 7 — Deployment

* Production frontend
* Production backend
* Production Supabase configuration
* Domain
* HTTPS
* environment variables

### Phase 8 — Production Test

Test all flows:

```text
Anonymous visitor
        |
        v
Landing page
        |
        v
Request Access
        |
        v
Pending
        |
        v
Admin approval
        |
        v
Login
        |
        v
AiFlow
```

Also test:

```text
Anonymous -> cannot access app
Demo -> limited access
Approved -> normal access
Disabled -> blocked
User A -> cannot access User B data
Frontend -> cannot access API secrets
```

---

# 22. Success Criteria

The implementation is complete when:

* AiFlow has a public professional landing page.
* Anyone can read about the project.
* Anyone can request access.
* Actual application access requires authentication.
* Users are not automatically granted unrestricted access.
* Demo users have controlled access.
* Approved users have normal access.
* Admin can approve/disable users.
* LLM/API secrets are never exposed to the browser.
* User data is isolated.
* Usage is rate-limited.
* Unexpected LLM/API costs are controlled.
* The application is deployed over HTTPS.
* The URL can safely be shared on LinkedIn, Medium, GitHub, resume, and job applications.

---

# 23. Important Product Principle

Do NOT optimize this project for maximum public usage.

Optimize it for:

**"A technically sophisticated person sees AiFlow, becomes interested, requests access, and can quickly experience the product."**

The primary audience is:

* Senior Engineers
* Staff Engineers
* Engineering Managers
* CTOs
* AI Engineers
* Startup Founders
* Technical Recruiters

The deployment should make AiFlow feel like a serious engineering project while keeping control over who can actually use it.

---

# 24. Final Instruction to Claude

Start by inspecting the existing codebase.

Do not immediately start coding.

First provide:

1. Current architecture summary
2. Existing authentication status
3. Existing Supabase integration
4. Existing deployment configuration
5. Files that need modification
6. Recommended implementation approach
7. Any security risks you identify

Then implement the solution incrementally.

Preserve existing functionality.

Avoid unnecessary rewrites.

After implementation, provide:

* Files changed
* Database/schema changes
* Environment variables required
* Deployment steps
* Security considerations
* How to approve a user
* How to create/manage a demo user
* How to test the complete access flow

The final result should be production-deployable but intentionally **gated and controlled**, not an unrestricted public application.
