# Production Deployment Checklist

This document outlines everything needed to deploy this ecommerce site to production.

## ✅ Required Infrastructure

### 1. **File Storage (AWS S3 or Alternative)**
Currently using local file storage. For production, you need cloud storage.

**Options:**
- **AWS S3** (recommended)
- **Cloudflare R2** (S3-compatible, cheaper)
- **DigitalOcean Spaces** (S3-compatible)
- **Google Cloud Storage**

**Setup Steps:**
1. Install Payload S3 storage adapter:
   ```bash
   pnpm add @payloadcms/storage-s3
   ```

2. Configure in `src/payload.config.ts`:
   ```typescript
   import { s3Storage } from '@payloadcms/storage-s3'
   
   // In buildConfig:
   plugins: [
     ...plugins,
     s3Storage({
       collections: {
         media: {
           prefix: 'media',
         },
       },
       bucket: process.env.S3_BUCKET!,
       config: {
         credentials: {
           accessKeyId: process.env.S3_ACCESS_KEY_ID!,
           secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
         },
         region: process.env.S3_REGION || 'us-east-1',
       },
     }),
   ]
   ```

3. Update `src/collections/Media.ts` to remove `staticDir` (S3 adapter handles this)

4. Environment variables needed:
   ```
   S3_BUCKET=your-bucket-name
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_REGION=us-east-1
   ```

### 2. **Database (PostgreSQL)**
Currently configured for PostgreSQL. For production:

**Options:**
- **AWS RDS** (PostgreSQL)
- **Supabase** (managed PostgreSQL)
- **DigitalOcean Managed Databases**
- **Railway** (PostgreSQL)
- **Neon** (serverless PostgreSQL)

**Environment Variable:**
```
DATABASE_URI=postgresql://user:password@host:5432/database
```

**Important:**
- Enable SSL connections
- Set up automated backups
- Configure connection pooling
- Use read replicas for high traffic

### 3. **Hosting Platform**
**Recommended Options:**
- **Vercel** (easiest for Next.js)
- **AWS** (EC2, ECS, or Lambda)
- **Railway**
- **Render**
- **DigitalOcean App Platform**

**Environment Variables to Set:**
```
NODE_ENV=production
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
PAYLOAD_SECRET=your-secret-key-here
DATABASE_URI=your-production-database-uri
```

### 4. **Domain & SSL**
- Purchase domain
- Configure DNS records
- SSL certificate (usually automatic with Vercel/Railway)
- Update `NEXT_PUBLIC_SERVER_URL` to production domain

### 5. **Email Service (Resend)**
Already configured. For production:

**Setup:**
1. Verify your domain in Resend dashboard
2. Update `EMAIL_FROM_ADDRESS` to use your domain:
   ```
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your Store Name
   RESEND_API_KEY=your-production-api-key
   ```

### 6. **Stripe (Payments)**
**Production Setup:**
1. Switch from test to live keys:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_...
   ```

2. Configure webhooks in Stripe Dashboard:
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhooks`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`

3. **Important:** Images will sync to Stripe once S3 is configured (public URLs)

### 7. **CDN (Content Delivery Network)**
For serving static assets and images faster:

**Options:**
- **Cloudflare** (free tier available)
- **AWS CloudFront** (if using S3)
- **Vercel Edge Network** (automatic with Vercel)

### 8. **Monitoring & Logging**
**Recommended Services:**
- **Sentry** (error tracking)
- **Logtail** or **Datadog** (logging)
- **Vercel Analytics** (if using Vercel)
- **Google Analytics** (optional)

### 9. **Backup Strategy**
- **Database Backups:**
  - Automated daily backups (most managed DBs do this)
  - Point-in-time recovery
  - Test restore procedures

- **File Backups:**
  - S3 versioning enabled
  - Cross-region replication (optional)

### 10. **Security**
- [ ] Use strong `PAYLOAD_SECRET` (generate with `openssl rand -base64 32`)
- [ ] Enable database SSL
- [ ] Use environment variables (never commit secrets)
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Use HTTPS everywhere
- [ ] Regular security updates

## 📋 Pre-Deployment Checklist

### Code Changes Needed:
- [ ] Install S3 storage adapter
- [ ] Configure S3 in `payload.config.ts`
- [ ] Remove `staticDir` from Media collection
- [ ] Update all environment variables
- [ ] Test Stripe webhooks locally with Stripe CLI
- [ ] Run database migrations
- [ ] Generate production build: `pnpm build`
- [ ] Test production build locally: `pnpm start`

### Environment Variables Checklist:
```bash
# Core
NODE_ENV=production
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
PAYLOAD_SECRET=your-secret-key

# Database
DATABASE_URI=postgresql://...

# Storage (S3)
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_REGION=us-east-1

# Email
RESEND_API_KEY=your-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Store Name

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_...
```

## 🚀 Deployment Steps

### 1. **Prepare S3 Bucket**
```bash
# Create bucket
aws s3 mb s3://your-bucket-name

# Set CORS policy (for public image access)
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

### 2. **Run Database Migrations**
```bash
pnpm payload migrate
```

### 3. **Deploy to Hosting Platform**
Follow your platform's deployment guide (Vercel, Railway, etc.)

### 4. **Configure Stripe Webhooks**
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
- Select events to listen for
- Copy webhook signing secret to environment variables

### 5. **Verify Everything**
- [ ] Admin panel accessible
- [ ] Products display correctly
- [ ] Images load from S3
- [ ] Checkout works
- [ ] Stripe payments process
- [ ] Order confirmation emails send
- [ ] Stripe product sync works (check Stripe dashboard)

## 🔧 Post-Deployment

### Ongoing Maintenance:
- Monitor error logs
- Check database performance
- Review Stripe webhook logs
- Monitor S3 costs
- Regular security updates
- Backup verification

### Performance Optimization:
- Enable image optimization (Sharp is already installed)
- Configure CDN caching
- Database query optimization
- Enable Next.js image optimization

## 📚 Additional Resources

- [Payload S3 Storage Docs](https://payloadcms.com/docs/storage/overview#s3)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Stripe Production Checklist](https://stripe.com/docs/keys)
- [PostgreSQL Production Best Practices](https://www.postgresql.org/docs/current/admin.html)

## ⚠️ Important Notes

1. **Never commit `.env` files** - Use your hosting platform's environment variable settings
2. **Test thoroughly** - Use staging environment before production
3. **Monitor costs** - S3, database, and hosting can add up
4. **Backup regularly** - Test your backup restore process
5. **Security first** - Keep dependencies updated, use strong secrets

