# Frontend Security Guidelines

## 1. Authentication and Authorization
- The operations dashboard must enforce role-based access control (RBAC). Currently, it is guarded by `API_AUTH_TOKEN`.
- Ensure all JWTs are stored securely (e.g., in memory or secure HttpOnly cookies, not in LocalStorage if avoiding XSS).

## 2. Cross-Site Scripting (XSS)
- React inherently protects against XSS when rendering text. Avoid using `dangerouslySetInnerHTML`.
- All JSON payloads and metadata displayed in the UI must be properly sanitized.

## 3. Cross-Origin Resource Sharing (CORS)
- The backend API restricts CORS using the `CORS_ORIGINS` environment variable.
- In production, this must be strictly set to the frontend's deployed domain. Wildcards (`*`) are only permitted in local test environments.

## 4. Content Security Policy (CSP)
- A strict CSP should be enforced on the frontend server (or via meta tags) to restrict script execution and data loading to trusted domains only.
