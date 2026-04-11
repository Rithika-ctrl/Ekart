# FEATURE #5: OAuth2 Social Login - Deployment Checklist

## Executive Summary
**Status: ⚠️ PARTIAL** — Google & GitHub working; Facebook requires App Review before production; Instagram disabled (API incompatibility).

**Current Providers**:
| Provider | Status | Role Allowed | Action Before Launch |
|----------|--------|------------|----------------------|
| **Google** | ✅ WORKING | All (customer, vendor, admin) | Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars |
| **GitHub** | ✅ WORKING | Admin only | Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET env vars |
| **Facebook** | ⚠️ LIMITED | Customer, Vendor | ← **Must complete App Review** before public deployment |
| **Instagram** | ❌ DISABLED | N/A | Deprecated — non-standard Graph API (future: implement custom provider if needed) |

---

## Pre-Launch Checklist

### 1. Google OAuth2 ✅ (Production-Ready)

**Status**: Works immediately once credentials configured.

**Steps**:
```
1. Go to: https://console.cloud.google.com/
2. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     * http://localhost:8080/login/oauth2/code/google (dev)
     * https://yourdomain.com/login/oauth2/code/google (prod)
3. Copy CLIENT_ID and CLIENT_SECRET
4. Set environment variables:
   export GOOGLE_CLIENT_ID="your-client-id"
   export GOOGLE_CLIENT_SECRET="your-client-secret"
5. Restart backend: java -jar ekart-0.0.1-SNAPSHOT.jar
```

**Testing**:
```
1. Open http://localhost:8080/
2. Click "Sign up with Google"
3. Verify redirect to Google login page
4. Verify callback returns OAuth token + creates customer account
```

**Production Notes**:
- ✅ No App Review required
- ✅ Instant setup
- ✅ Works in both dev & prod

---

### 2. GitHub OAuth2 ✅ (Production-Ready, Admin Only)

**Status**: Works immediately once credentials configured. **Admin role only**.

**Steps**:
```
1. Go to: https://github.com/settings/developers
2. Create OAuth App:
   - Application name: EKART Admin
   - Homepage URL: https://yourdomain.com
   - Authorization callback URL: https://yourdomain.com/login/oauth2/code/github (prod)
                                http://localhost:8080/login/oauth2/code/github (dev)
3. Generate Client Secret (if shown)
4. Copy CLIENT_ID and CLIENT_SECRET
5. Set environment variables:
   export GITHUB_CLIENT_ID="your-client-id"
   export GITHUB_CLIENT_SECRET="your-client-secret"
6. Restart backend
```

**Testing**:
```
1. Admin Login page: http://localhost:8080/admin/login
2. Click "Sign in with GitHub"
3. Verify redirect to GitHub auth page
4. Verify callback creates/updates admin account
5. Verify customer/vendor login pages do NOT show GitHub button
   (controlled by OAuthProviderValidator.isProviderAllowed("github", "customer"))
```

**Production Notes**:
- ✅ No App Review required
- ✅ Admin-only access (non-admin users blocked at backend)
- ⚠️ Requires separate GitHub OAuth App instance for production

---

### 3. Facebook OAuth2 ⚠️ (REQUIRES APP REVIEW)

**Status**: Works in development BUT **BLOCKED IN PRODUCTION** until Facebook App Review approved.

**Why App Review is required**:
- Facebook requires review for apps accessing user email, public profile
- Development-mode apps can only access app-specific test accounts (not real users)
- Production-mode apps need explicit Facebook team approval
- Review typically takes 1–7 business days

**Steps**:

#### Step 1: Initial Setup

```
1. Go to: https://developers.facebook.com/
2. Create a new Facebook App:
   - App Name: EKART Login
   - Use case: Authentication & Login
   - App type: Consumer
3. Configure Basic Settings:
   - App ID: (save this)
   - App Secret: (save this, keep confidential)
4. Add Facebook Login product (if not auto-added)
5. Configure OAuth Redirect URIs:
   - Valid OAuth Redirect URIs:
     * http://localhost:8080/login/oauth2/code/facebook (dev)
     * https://yourdomain.com/login/oauth2/code/facebook (prod)
6. Set environment variables (development):
   export FACEBOOK_CLIENT_ID="your-dev-app-id"
   export FACEBOOK_CLIENT_SECRET="your-dev-app-secret"
7. Restart backend
```

#### Step 2: Development Testing

```
1. Create a Facebook test account (via App Roles):
   - Go to: Roles → Test Users
   - Create test user with email
   - Confirm test user account via email
2. Test OAuth flow:
   - Backend running with FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET set
   - Customer/Vendor login page shows "Sign up with Facebook"
   - Click button, redirected to Facebook login
   - Log in with test account
   - Redirected back, account created in DB
3. Verify created customer:
   - Email: (from Facebook test account)
   - provider: "facebook"
   - providerId: (Facebook user ID)
```

#### Step 3: Submit App for Review (REQUIRED FOR PRODUCTION)

```
1. Go to: App Roles → Roles
   - Ensure at least one account is set as Admin
2. Go to: Settings → Basic
   - Fill in all required fields:
     * App Name: EKART
     * App Category: Shopping/Retail
     * Description: E-commerce platform
     * Privacy Policy URL: https://yourdomain.com/privacy
     * Terms of Service URL: https://yourdomain.com/terms
3. Go to: Apps & Businesses → App Review for Permissions
   - Submit for review:
     * Provide screenshots showing:
       - User login page with "Sign in with Facebook" button
       - OAuth workflow (login → account creation/linking)
       - User profile showing linked Facebook account
     * Explain use case: "Customers can register/login via Facebook"
4. Wait for approval (1–7 business days typical)
5. Once approved:
   - Facebook will email approval notice
   - Switch app to Live status (if not auto-switched)
   - Update FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET to live credentials
```

#### Step 4: Production Deployment

```
1. Create separate Facebook OAuth App for production (recommended):
   - App Name: EKART (Production)
   - Configured with production domain: https://yourdomain.com
   - Already approved in App Review (from setup above)
2. Set production environment variables:
   export FACEBOOK_CLIENT_ID="your-prod-app-id"
   export FACEBOOK_CLIENT_SECRET="your-prod-app-secret"
3. Update redirect_uri in app settings:
   - Valid OAuth Redirect URIs: https://yourdomain.com/login/oauth2/code/facebook
4. Deploy backend with env vars
5. Test with real Facebook account:
   - Customer/Vendor login page
   - Click "Sign up with Facebook"
   - Verify login works with actual (non-test) account
```

**Testing Checklist**:
- [ ] Development mode: Facebook test account login works
- [ ] Test account → Customer created with facebook provider
- [ ] Email address correct
- [ ] Account linking works (email+password → link Facebook OAuth)
- [ ] Facebook App Review submitted
- [ ] App Review approved (verify email from Facebook)
- [ ] Live app credentials working
- [ ] Real user Facebook login works (non-test account)
- [ ] Production database shows provider="facebook"

**Production Notes**:
- ⚠️ **MUST complete App Review before going live** (Facebook blocks unapproved apps after 90 days)
- ⚠️ Production app separate from dev app (different App ID, App Secret)
- ⚠️ Privacy Policy + Terms of Service URLs must be publicly accessible
- ✅ Takes ~1–7 days for approval (plan accordingly)
- ✅ Reusable indefinitely — submit once, use forever

---

### 4. Instagram OAuth2 ❌ (DISABLED - API Incompatibility)

**Status**: Disabled and removed from code (as of April 11, 2026).

**Why Disabled**:
- Instagram uses Meta's Graph API (non-standard OAuth2)
- Spring Security OAuth2 doesn't have built-in support for Instagram's specific requirements
- Would require custom OAuth2Provider implementation

**If Instagram needed in future**:
1. Create custom `UserInfoEndpoint` for Instagram Graph API
2. Map Instagram user fields to OIDC standard claims
3. Register as custom Spring OAuth2 provider
4. Update OAuthProviderValidator to enable instagram
5. Test with Instagram Business Account

**For now**: Instagram login button removed from UI (disabled in OAuthProviderValidator).

---

## Deployment Timeline

### BEFORE Public Launch (Week 1)
- [ ] Google credentials obtained + environment variables set
- [ ] GitHub credentials obtained + environment variables set
- [ ] Facebook App created in dev mode + tested
- [ ] Facebook App submitted for review (submit early — 1-7 days)

### During App Review (Days 1-7)
- [ ] Facebook team reviews app
- [ ] Monitor email for approval/rejection
- [ ] If rejected: Fix issues + resubmit

### BEFORE Going Live (Post-Approval)
- [ ] Facebook App approved
- [ ] Create production Facebook OAuth App
- [ ] Set production env vars
- [ ] Test with real Facebook account
- [ ] Deploy with all credentials

### After Launch
- [ ] Monitor OAuth login errors in logs
- [ ] Watch for failed authentication attempts
- [ ] Update redirect URIs if domain changes

---

## Configuration Summary

### Environment Variables Required

```bash
# REQUIRED for production
export GOOGLE_CLIENT_ID="google-client-id"
export GOOGLE_CLIENT_SECRET="google-client-secret"
export GITHUB_CLIENT_ID="github-client-id"
export GITHUB_CLIENT_SECRET="github-client-secret"
export FACEBOOK_CLIENT_ID="facebook-app-id"
export FACEBOOK_CLIENT_SECRET="facebook-app-secret"

# NOT USED (Instagram disabled)
# export INSTAGRAM_CLIENT_ID="..."
# export INSTAGRAM_CLIENT_SECRET="..."
```

### Files Modified (This Fix)

1. **application.properties**
   - Added provider status documentation
   - Commented out Instagram config
   - Added Facebook App Review warning
   - Added GitHub admin-only note

2. **OAuthProviderValidator.java**
   - Removed "instagram" from all allowed provider lists
   - Added inline comments explaining why

3. **OAUTH2-DEPLOYMENT-CHECKLIST.md** (this file)
   - Detailed steps for each provider
   - Facebook App Review process explained
   - Timeline and checklist

---

## Support & Troubleshooting

### Google OAuth Issues
```
Error: "Client_error: invalid_request"
→ Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in env vars
→ Verify Authorized redirect URI matches backend domain + /login/oauth2/code/google
→ Check Google Cloud Console security settings
```

### GitHub OAuth Issues
```
Error: "Authentication Failed" on non-admin login
→ This is expected — GitHub login is admin-only (by design)
→ Only /admin/login page shows GitHub button
→ Customers/vendors cannot use GitHub login (use Google or Facebook instead)

Error: "Invalid client credentials"
→ Verify GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET in env vars
→ Check GitHub OAuth App settings for correct credentials
```

### Facebook OAuth Issues
```
Error: "This app is not set up for public access"
→ App is in development mode or awaiting App Review
→ Can only use with test accounts until approved
→ Submit for App Review (see Step 3 above)

Error: "Redirect URI mismatch"
→ Verify oauth_callback_url matches Valid OAuth Redirect URIs in Facebook App settings
→ Example: https://yourdomain.com/login/oauth2/code/facebook
→ Restart backend after config change

Error: "Facebook app is not live"
→ After approval, switch app to Live status in App Settings
→ Generate new app credentials for Live mode
```

---

## Summary

**Launch Status**:
- ✅ Google: Ready
- ✅ GitHub: Ready (admin-only)
- ⚠️ Facebook: Pending App Review
- ❌ Instagram: Disabled

**Action Required Before Public Launch**:
1. **Submit Facebook App for review** (do this immediately — takes 1-7 days)
2. Obtain Google & GitHub credentials
3. Set all environment variables
4. Test with real accounts (after Facebook approval)
5. Deploy

**Estimated Timeline**: 1–2 weeks (waiting for Facebook approval)

---

Last Updated: April 11, 2026  
Feature #5: OAuth2 Social Login
