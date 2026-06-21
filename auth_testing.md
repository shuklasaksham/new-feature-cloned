# Bracket auth testing playbook (Emergent Google Auth + Email OTP + Password)

Auth model: cookie-based `session_token` in `user_sessions` collection.
Multiple ways to authenticate:
1. **Google** (Emergent-managed): redirect to `https://auth.emergentagent.com/?redirect={origin}/auth/callback` → fragment `#session_id=...` → backend exchanges via `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with `X-Session-ID` header → backend stores session_token + sets httpOnly cookie.
2. **Email OTP**: `POST /api/auth/otp/request {email}` → Resend sends 6-digit code → `POST /api/auth/otp/verify {email, code}` → backend issues session_token + cookie.
3. **Email + password**: only available after a user has set a password via `POST /api/auth/password/set`. Login: `POST /api/auth/login {email, password}`.

User identity:
- `users.user_id` (custom UUID `user_{12hex}`) — NEVER MongoDB `_id`
- `users.email`, `users.name`, `users.designation`, `users.avatar`, `users.password_hash` (bcrypt, optional)
- All Mongo queries use `{"_id": 0}` projection.

## Manual API tests
```bash
# OTP request — should return {"ok": true} and log code to server console
curl -X POST $BASE/api/auth/otp/request -H "Content-Type: application/json" -d '{"email":"test@example.com"}'

# OTP verify — needs the code from the email
curl -i -X POST $BASE/api/auth/otp/verify -H "Content-Type: application/json" -d '{"email":"test@example.com","code":"123456"}'

# Use the Set-Cookie or grab session_token from response → /me
curl $BASE/api/auth/me -H "Cookie: session_token=<TOKEN>"
```

## Browser test for protected routes
```python
await page.context.add_cookies([{
  "name": "session_token", "value": "<TOKEN>",
  "domain": "design-decided.preview.emergentagent.com", "path": "/",
  "httpOnly": True, "secure": True, "sameSite": "None"
}])
await page.goto("https://design-decided.preview.emergentagent.com/app")
```

## Cleanup
```python
db.users.delete_many({"email": {"$regex": "test\\."}}); db.user_sessions.delete_many({"session_token": {"$regex": "test_"}})
```
