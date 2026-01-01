# Production Deployment Guide for dev.dajuvai.com

## CORS Configuration

The backend is now configured to accept requests from **ANY DOMAIN**.

### Automatic Acceptance
- **All origins** - Any domain can make requests to the API
- **No origin** (for mobile apps, Postman, curl)
- **Credentials enabled** - Supports cookies and authentication headers

## Environment Variables for Production

When deploying to `dev.dajuvai.com`, ensure these environment variables are set:

```bash
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev"

# JWT
JWT_SECRET="mysecretkey123_extended_to_meet_minimum_32_character_requirement_for_security"
JWT_REFRESH_SECRET="refresh_token_secret_key_extended_to_meet_minimum_32_character_requirement"

# URLs
FRONTEND_URL=https://dajuvai.com
BACKEND_URL=https://dev.dajuvai.com
PRODUCTION_FRONTEND_URL=https://dajuvai.com
PRODUCTION_BACKEND_URL=https://dev.dajuvai.com

# Email
USER_EMAIL="Dajuvai106@gmail.com"
PASS_EMAIL="qltqsneamkmoayfu"

# OAuth
GOOGLE_CLIENT_ID="130383104301-k4n82crjg9k9itcmgrqc7lvd0872r8bp.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
FACEBOOK_APP_ID="1239678851238356"
FACEBOOK_APP_SECRET="f7a6d087b71baf7c1f6378373639b965"

# Cloudinary
CLOUDINARY_CLOUD_NAME="dxvyc12au"
CLOUDINARY_API_KEY="234982931945474"
CLOUDINARY_API_SECRET="RLv2jBajL4aNnKuszNZk5ApFk1s"

# Payment Gateways
NPG_BASE_URL=https://merchantsandbox.nepalpayment.com
NPG_API_USERNAME=leaflet
NPG_API_PASSWORD=Leaflet@123
NPG_MERCHANT_ID=7468
NPG_SECRET_KEY=Test@123
NPG_ACCESS_CODE=LFD100

ESEWA_MERCHANT=NP-ES-DAJUVAI
SECRET_KEY=IRIPAhcSAkU9CgdFNA4eUSspSDY2WiUyITAvJDpfMjEyMjo4JjAgJDIsICAg
ESEWA_PAYMENT_URL=https://epay.esewa.com.np/api/epay/main/v2/form
```

## Deployment Steps

1. **Build & Deploy Backend**
   ```bash
   cd backend
   npm install
   npm run dev  # or npm start for production
   ```

2. **Configure Reverse Proxy (Nginx/Apache)**
   Point `dev.dajuvai.com` to your backend server on port 5000

3. **SSL Certificate**
   Ensure SSL is configured for `dev.dajuvai.com` (HTTPS required for production)

4. **Update Frontend Environment**
   In your frontend `.env.local` or `.env.production`:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://dev.dajuvai.com
   ```

## Testing CORS

After deployment, test CORS from different origins:

```bash
# Test from production frontend
curl -H "Origin: https://dajuvai.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://dev.dajuvai.com/api/products

# Test from localhost
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://dev.dajuvai.com/api/products
```

Expected response headers:
- `Access-Control-Allow-Origin: <requesting-origin>`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`

## CORS Features

✅ **Accepts requests from any dajuvai.com subdomain**
✅ **Supports credentials (cookies, auth headers)**
✅ **Allows all standard HTTP methods**
✅ **Handles preflight OPTIONS requests**
✅ **Logs blocked origins in production for debugging**
✅ **Flexible localhost support for development**

## Troubleshooting

### CORS Error Still Occurring?

1. **Check browser console** for the exact error message
2. **Verify SSL** - Mixed content (HTTP/HTTPS) causes CORS issues
3. **Check request headers** - Ensure Authorization header is included
4. **Verify origin** - Make sure the frontend URL matches exactly
5. **Check logs** - Backend will log blocked origins in production

### Common Issues

**Issue:** "No 'Access-Control-Allow-Origin' header"
**Solution:** Ensure the frontend is making requests to `https://dev.dajuvai.com` (not HTTP)

**Issue:** "Credentials flag is true, but Access-Control-Allow-Credentials is not"
**Solution:** Already configured - ensure frontend sends `credentials: 'include'` in fetch/axios

**Issue:** "Origin not allowed by CORS"
**Solution:** Check backend logs to see which origin was blocked, add it to allowedOrigins if needed

## Security Notes

- CORS is configured to be permissive for all dajuvai.com subdomains
- In production, only HTTPS origins are accepted (except localhost for dev)
- Credentials are enabled for authentication
- Preflight requests are cached for 24 hours to reduce overhead
