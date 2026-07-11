# AgileFlow Authentication Protocol

Authentication is handled via JWT (JSON Web Tokens).

## Authentication Flow
1. User requests registration or login on `/api/auth/register` or `/api/auth/login`.
2. Upon successful validation, the server generates a token signed with the JWT secret.
3. The token is sent to the client and stored in `localStorage`.
4. Subsequent requests include the token in the `Authorization` header as `Bearer <token>`.
