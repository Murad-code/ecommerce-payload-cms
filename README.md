# Payload Ecommerce Template

This is a production-ready ecommerce template built with [Payload CMS](https://payloadcms.com) and [Next.js](https://nextjs.org). This template includes a fully-working backend, enterprise-grade admin panel, and a beautifully designed frontend website.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Initial Setup](#initial-setup)
- [Important Configuration Notes](#important-configuration-notes)
- [Stripe Payment Setup](#stripe-payment-setup)
- [Email Configuration](#email-configuration)
- [Database Setup](#database-setup)
- [Creating Your First Content](#creating-your-first-content)
- [Development](#development)
- [Production](#production)
- [Features](#features)

## Quick Start

### Prerequisites

- Node.js 18.20.2+ or 20.9.0+
- pnpm (recommended) or npm
- PostgreSQL database (for production) or use the default MongoDB adapter for development
- Stripe account (for payments)
- Resend account (for emails)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd ecommerce
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

5. **Open your browser:**
   - Frontend: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`

6. **Create your first admin user:**
   - Navigate to `http://localhost:3000/admin`
   - Follow the on-screen instructions to create your first admin user

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```bash
# Payload Configuration
PAYLOAD_SECRET=your-super-secret-key-here-min-32-characters
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Database
DATABASE_URI=postgresql://user:password@localhost:5432/ecommerce

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_...

# Email (Required for order confirmations)
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Store Name
```

### Optional Variables

```bash
# Node Environment
NODE_ENV=development
```

### Generating Secrets

- **PAYLOAD_SECRET**: Generate a random 32+ character string. You can use:
  ```bash
  openssl rand -base64 32
  ```

## Initial Setup

### 1. Database Setup

This template uses PostgreSQL by default. Make sure you have PostgreSQL installed and running.

**Local Development:**
- Install PostgreSQL locally or use Docker
- Create a new database:
  ```sql
  CREATE DATABASE ecommerce;
  ```
- Update `DATABASE_URI` in your `.env` file

**Production:**
- Use a managed PostgreSQL service (AWS RDS, DigitalOcean, etc.)
- Update `DATABASE_URI` with your production database connection string

### 2. Stripe Setup

See [Stripe Payment Setup](#stripe-payment-setup) section below.

### 3. Email Setup

See [Email Configuration](#email-configuration) section below.

### 4. Run Migrations (PostgreSQL only)

If you're using PostgreSQL, run migrations to set up the database schema:

```bash
pnpm payload migrate
```

## Important Configuration Notes

### Home Page Slug

**⚠️ Important:** The page with the slug `home` will be used as the default homepage (`/`).

- When you create a page in the admin panel, if you set the slug to `home`, it will automatically be served at the root URL (`/`)
- If no page with slug `home` exists, the root route will return a 404
- Make sure to create a page with slug `home` as your first page

### Currency Configuration

This template is configured to use **GBP (British Pounds)** by default. The currency configuration is set in two places:

1. **Backend** (`src/plugins/index.ts`):
   ```typescript
   currencies: {
     defaultCurrency: 'GBP',
     supportedCurrencies: [
       {
         code: 'GBP',
         symbol: '£',
         decimals: 2,
         label: 'British Pound',
       },
     ],
   }
   ```

2. **Frontend** (`src/providers/index.tsx`):
   ```typescript
   currenciesConfig: {
     defaultCurrency: 'GBP',
     supportedCurrencies: [
       {
         code: 'GBP',
         symbol: '£',
         decimals: 2,
         label: 'British Pound',
       },
     ],
   }
   ```

**To change currencies:** You must update both locations to match. Also ensure your payment provider (Stripe) supports the currencies you want to use.

### Guest Checkout

Guest checkout is enabled by default. Users can:
- Add items to cart without logging in
- Complete checkout with just an email address
- View their orders using order ID and email

### Access Control

- **Admin users**: Full access to admin panel and all content
- **Customer users**: Can access their own orders, addresses, and carts
- **Guest users**: Can checkout and view orders by email/order ID
- **Public**: Can view published pages and products

## Stripe Payment Setup

### 1. Create a Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in to your account
3. Complete your account setup

### 2. Get Your API Keys

1. Navigate to [API Keys](https://dashboard.stripe.com/test/apikeys) in your Stripe dashboard
2. Copy your **Secret Key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable Key** (starts with `pk_test_` for test mode)
4. Add them to your `.env` file:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### 3. Set Up Webhooks

Webhooks are required for payment confirmation:

1. Install Stripe CLI (for local development):
   ```bash
   brew install stripe/stripe-cli/stripe  # macOS
   # or visit https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   pnpm stripe-webhooks
   # This runs: stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
   ```bash
   STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_...
   ```

**For Production:**
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks) in Stripe dashboard
2. Click "Add endpoint"
3. Set endpoint URL to: `https://yourdomain.com/api/stripe/webhooks`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the signing secret and add to your production `.env`

### 4. Test Payments

Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

## Email Configuration

This template uses [Resend](https://resend.com) for sending emails (order confirmations, etc.).

### 1. Create a Resend Account

1. Go to [Resend](https://resend.com) and sign up
2. Verify your email address

### 2. Get Your API Key

1. Navigate to [API Keys](https://resend.com/api-keys) in Resend dashboard
2. Create a new API key
3. Copy the API key (starts with `re_`)
4. Add to your `.env` file:
   ```bash
   RESEND_API_KEY=re_...
   ```

### 3. Configure Sender Email

1. In Resend dashboard, go to [Domains](https://resend.com/domains)
2. Add and verify your domain (or use Resend's test domain for development)
3. Set your sender email in `.env`:
   ```bash
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your Store Name
   ```

**Note:** For development, you can use Resend's test domain, but emails may go to spam. For production, always use your own verified domain.

## Database Setup

### PostgreSQL (Recommended for Production)

1. **Create the database:**
   ```sql
   CREATE DATABASE ecommerce;
   ```

2. **Update `.env`:**
   ```bash
   DATABASE_URI=postgresql://user:password@localhost:5432/ecommerce
   ```

3. **Run migrations:**
   ```bash
   pnpm payload migrate
   ```

### Local Development with Auto-Push

For local development, the Postgres adapter has `push: true` enabled, which automatically updates your schema when you make changes. This is convenient but should **never** be used in production.

**⚠️ Warning:** If your database is pointed to production, set `push: false` in your database adapter configuration to prevent accidental data loss.

### Creating Migrations

When you make schema changes:

1. **Create a migration:**
   ```bash
   pnpm payload migrate:create
   ```

2. **Review the generated migration file** in `src/migrations/`

3. **Run migrations:**
   ```bash
   pnpm payload migrate
   ```

## Creating Your First Content

### 1. Create the Home Page

1. Go to `http://localhost:3000/admin`
2. Navigate to **Pages** collection
3. Click **Create New**
4. **Important:** Set the slug to `home` (this will be your homepage)
5. Add a title, hero section, and layout blocks
6. Click **Save** and then **Publish**

### 2. Configure Header and Footer

1. Go to **Globals** → **Header**
2. Add navigation items
3. Go to **Globals** → **Footer**
4. Configure footer content
5. Click **Save**

### 3. Create Categories

1. Go to **Categories** collection
2. Create categories for your products (e.g., "T-Shirts", "Hats", "Accessories")
3. These will be used to organize products

### 4. Create Products

1. Go to **Products** collection
2. Click **Create New**
3. Fill in:
   - Title
   - Slug (URL-friendly version)
   - Description
   - Price (in GBP)
   - Inventory quantity
   - Categories
   - Gallery images
4. Click **Save** and **Publish**

### 5. Test the Checkout Flow

1. Visit your homepage: `http://localhost:3000`
2. Browse products
3. Add items to cart
4. Go to checkout
5. Use a test Stripe card: `4242 4242 4242 4242`
6. Complete the order
7. Check that you receive an order confirmation email

## Development

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Generate TypeScript types
pnpm generate:types

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run tests
pnpm test

# Run integration tests only
pnpm test:int

# Run E2E tests only
pnpm test:e2e
```

### Development Tips

1. **Type Generation**: After making schema changes, run `pnpm generate:types` to update TypeScript types
2. **Hot Reload**: The dev server supports hot reload for both frontend and backend changes
3. **Admin Panel**: Changes to collections, fields, and globals are reflected immediately in the admin panel
4. **Database**: Use `push: true` in development for automatic schema updates (never in production!)

### Admin Panel Column Preferences

The admin panel allows you to customize which columns are displayed in collection list views. These preferences are saved per user and persist across sessions.

**How to Customize Columns:**

1. Navigate to any collection in the admin panel (e.g., Orders, Products, Users)
2. In the list view, click the column selector icon (usually in the top-right of the table)
3. Select or deselect columns to show/hide them
4. Reorder columns by dragging them
5. Your preferences are automatically saved to your user account

**How It Works:**

- **Default Columns**: Each collection has default columns defined in code (via `admin.defaultColumns` in collection config)
- **User Preferences**: When you customize columns, your preferences are saved in the `payload-preferences` collection in the database
- **Persistence**: Your column preferences are linked to your user account and will persist after page refreshes
- **Per User**: Each admin user can have their own column preferences for each collection
- **URL State**: Column state is also stored in the URL, allowing you to share specific column configurations via direct links

**Note**: You don't need to modify code to change columns - all customization is done through the admin panel UI. The `defaultColumns` setting in code only determines the initial columns shown to new users or when preferences are reset.

## Production

### Building for Production

1. **Set production environment variables:**
   - Update `NEXT_PUBLIC_SERVER_URL` to your production URL
   - Use production Stripe keys
   - Use production database connection string
   - Use production Resend API key

2. **Build the application:**
   ```bash
   pnpm build
   ```

3. **Run migrations** (if using PostgreSQL):
   ```bash
   pnpm payload migrate
   ```

4. **Start the server:**
   ```bash
   pnpm start
   ```

### Deployment Considerations

- **Database**: Use a managed PostgreSQL service (AWS RDS, DigitalOcean, etc.)
- **File Storage**: Configure a storage adapter for media files (S3, Cloudflare R2, etc.)
- **Environment Variables**: Set all required variables in your hosting platform
- **Webhooks**: Configure Stripe webhooks to point to your production URL
- **Email**: Verify your domain in Resend for production email delivery

## Features

### Core Features

- ✅ **Authentication**: User accounts with admin and customer roles
- ✅ **Products & Variants**: Full product management with variant support
- ✅ **Shopping Cart**: Persistent carts for logged-in users and guests
- ✅ **Checkout**: Guest and authenticated checkout flows
- ✅ **Payments**: Stripe integration for secure payments
- ✅ **Orders**: Complete order management and tracking
- ✅ **Email Notifications**: Automated order confirmation emails
- ✅ **Layout Builder**: Flexible page layouts with blocks
- ✅ **SEO**: Built-in SEO optimization
- ✅ **Draft Preview**: Preview content before publishing
- ✅ **Media Management**: Image upload and management
- ✅ **Search**: Product search functionality
- ✅ **Categories**: Product categorization
- ✅ **Addresses**: Saved shipping addresses for customers

### Collections

- **Users**: Admin and customer user accounts
- **Pages**: Content pages with layout builder
- **Products**: Ecommerce products with variants
- **Categories**: Product categories
- **Media**: Image and file uploads
- **Carts**: Shopping cart management
- **Orders**: Order records
- **Transactions**: Payment transaction records
- **Addresses**: Customer shipping addresses

### Globals

- **Header**: Site navigation and header configuration
- **Footer**: Footer content and links

## Troubleshooting

### Common Issues

1. **"Email adapter is not configured"**
   - Make sure `RESEND_API_KEY` is set in your `.env` file
   - Verify the API key is correct in Resend dashboard

2. **"Payment failed" or Stripe errors**
   - Verify all Stripe keys are set correctly
   - Check that webhooks are configured
   - Ensure you're using test keys in development

3. **Database connection errors**
   - Verify `DATABASE_URI` is correct
   - Check that PostgreSQL is running
   - Ensure database exists and user has permissions

4. **Homepage returns 404**
   - Create a page with slug `home` in the admin panel
   - Make sure the page is published

5. **Types are out of date**
   - Run `pnpm generate:types` after schema changes

## Support

For issues and questions:
- [Payload Discord](https://discord.com/invite/payload)
- [Payload Documentation](https://payloadcms.com/docs)
- [GitHub Discussions](https://github.com/payloadcms/payload/discussions)

## License

MIT
