# Refund Workflow Breakdown

This document explains how the refund process works in the codebase, including what calls what and where potential issues might occur.

## Overview

There are **two ways** to create refunds:

1. **Direct Admin UI Creation** - Admin creates refund directly in Payload CMS admin UI
2. **API Endpoint** - Admin uses `/api/refunds/process` endpoint (used by buttons on order pages)

Both methods should create a refund record and process it via Stripe, but they follow different code paths.

---

## Method 1: Direct Admin UI Creation (Your Current Issue)

When you create a refund directly in the admin UI by filling out the form and clicking "Save":

### Step-by-Step Flow

```
1. Admin fills out refund form (order, type, amount, reason)
   ↓
2. Form submits to Payload's default create endpoint
   ↓
3. BEFORE CHANGE HOOKS (run sequentially):
   ├─ Auto-populate processedBy/processedAt
   ├─ autoPopulateRefundFields (populates transaction, currency, paymentIntentId, amount)
   └─ validateRefund (validates order, transaction, amount)
   ↓
4. Refund record is SAVED to database (with status: 'processing')
   ↓
5. AFTER CHANGE HOOKS (run sequentially):
   ├─ processStripeRefund (calls Stripe API)
   │   ├─ Fetches order and transaction
   │   ├─ Calls Stripe API: processFullRefund() or processPartialRefund()
   │   ├─ Updates refund record with stripeRefundId, stripeChargeId, status
   │   └─ If error: Updates status to 'failed' (doesn't throw)
   └─ updateOrderAfterRefund (updates order.totalRefunded, order.status, order.refunds)
   ↓
6. Response returned to form
```

### Key Files

- **Form Component**: Payload CMS default form (no custom component)
- **Collection Config**: `src/collections/Refunds/index.ts`
- **Auto-populate Hook**: `src/collections/Refunds/hooks/autoPopulateRefundFields.ts`
- **Validation Hook**: `src/collections/Refunds/hooks/validateRefund.ts`
- **Stripe Processing Hook**: `src/collections/Refunds/hooks/processStripeRefund.ts`
- **Order Update Hook**: `src/collections/Refunds/hooks/updateOrderAfterRefund.ts`
- **Stripe API**: `src/lib/stripe/refunds.ts`

### The Problem

**Issue**: Form stays in "submitting" state, Stripe refund succeeds, but refund record not created.

**Root Cause Analysis**:

1. The refund record **IS created** (saved in step 4 before Stripe processing)
2. The Stripe API call **succeeds** (you see it in Stripe dashboard)
3. But the form **doesn't complete** - likely because:
   - The `afterChange` hook (`processStripeRefund`) is taking too long or timing out
   - There's an error in the hook that's not being caught properly
   - The hook is throwing an error that prevents the response from being sent
   - There's a network timeout between Payload and Stripe API

### Potential Issues

1. **Timeout**: If the Stripe API call takes longer than the request timeout, the form hangs
2. **Error Handling**: If `processStripeRefund` throws an error (even though it has try/catch), it might prevent response
3. **Missing Fields**: If required fields are missing after auto-population, the hook might fail
4. **Race Condition**: If the hook tries to update the refund before it's fully saved

---

## Method 2: API Endpoint (`/api/refunds/process`)

When using the API endpoint (e.g., from order page buttons):

### Step-by-Step Flow

```
1. Frontend calls POST /api/refunds/process
   ↓
2. API route handler (src/app/(app)/api/refunds/process/route.ts):
   ├─ Validates request (orderId, type, amount)
   ├─ Fetches order and transaction
   ├─ Calls Stripe API FIRST: processFullRefund() or processPartialRefund()
   ├─ Creates refund record with stripeRefundId already set
   └─ Updates order (totalRefunded, status, refunds relationship)
   ↓
3. Returns response to frontend
```

### Key Files

- **API Route**: `src/app/(app)/api/refunds/process/route.ts`
- **Stripe API**: `src/lib/stripe/refunds.ts`

### Why This Works Better

- Stripe API is called **before** creating the refund record
- If Stripe fails, the refund record is never created
- Response is returned immediately after Stripe succeeds
- No hooks run (direct database operation)

---

## Detailed Code Flow: Direct Admin UI Creation

### 1. Form Submission

**Location**: Payload CMS admin UI (default form)

**What happens**:
- User fills form fields: `order`, `type`, `amount`, `reason`
- `AutoPopulateTransaction` component (client-side) auto-fills some fields
- Form submits to Payload's internal create endpoint

### 2. Before Change Hooks

**Location**: `src/collections/Refunds/index.ts` (lines 181-197)

**Hooks run in order**:

#### a) Auto-populate processedBy/processedAt
```typescript
// Lines 182-193
if (operation === 'create' && req.user) {
  data.technicalDetails.processedBy = req.user.id
  data.technicalDetails.processedAt = new Date().toISOString()
}
```

#### b) autoPopulateRefundFields
**File**: `src/collections/Refunds/hooks/autoPopulateRefundFields.ts`

**What it does**:
- Fetches order with depth=2
- Auto-populates `technicalDetails.transaction` from order's primary transaction
- Auto-populates `currency` from order
- Auto-populates `technicalDetails.paymentIntentId` from transaction
- Auto-populates `amount` (converts pounds to pence if needed)
- Handles full vs partial refund logic

**Key Logic**:
- If amount < 1000, assumes it's in pounds and converts to pence
- For full refunds, calculates refundable amount
- For partial refunds, doesn't auto-populate (admin must specify)

#### c) validateRefund
**File**: `src/collections/Refunds/hooks/validateRefund.ts`

**What it does**:
- Validates order can be refunded (status, etc.)
- Validates transaction exists and can be refunded
- Validates refund amount (not exceeding refundable amount)
- Checks for duplicate refunds
- Sets transaction and paymentIntentId if not already set
- **Throws errors** if validation fails (prevents save)

### 3. Database Save

**What happens**:
- Refund record is saved to database
- Status defaults to `'processing'`
- All fields from beforeChange hooks are saved

### 4. After Change Hooks

**Location**: `src/collections/Refunds/index.ts` (lines 198-201)

**Hooks run in order**:

#### a) processStripeRefund
**File**: `src/collections/Refunds/hooks/processStripeRefund.ts`

**What it does**:
1. Checks if already processed (has stripeRefundId) - if yes, skips
2. Validates required fields (order, type, amount)
3. Fetches order with depth=2
4. Gets primary transaction
5. Checks for duplicate successful refunds
6. **Calls Stripe API**:
   - `processFullRefund(paymentIntentId, reason)` OR
   - `processPartialRefund(paymentIntentId, amount, reason)`
7. Updates refund record with:
   - `status` (based on Stripe response)
   - `technicalDetails.stripeRefundId`
   - `technicalDetails.stripeChargeId`
8. If error: Updates status to `'failed'` (doesn't throw)

**Stripe API Calls**:
- **File**: `src/lib/stripe/refunds.ts`
- `processFullRefund()`: Calls `stripe.refunds.create({ payment_intent: paymentIntentId })`
- `processPartialRefund()`: Calls `stripe.refunds.create({ payment_intent: paymentIntentId, amount })`

**Error Handling**:
- All errors are caught and logged
- Refund status is updated to `'failed'`
- Hook returns doc (doesn't throw)

#### b) updateOrderAfterRefund
**File**: `src/collections/Refunds/hooks/updateOrderAfterRefund.ts`

**What it does**:
1. Refetches refund to get latest data (after Stripe processing)
2. Calculates new `totalRefunded` = current + refund amount
3. Updates order status:
   - If fully refunded: `'refunded'`
   - If partially refunded: `'partially_refunded'`
4. Adds refund to `order.refunds` relationship
5. Updates transaction status to `'refunded'`

**Error Handling**:
- Errors are caught and logged
- Hook returns doc (doesn't throw)

### 5. Response Returned

**What should happen**:
- Payload returns success response
- Form shows success message
- User is redirected or form closes

**What might be going wrong**:
- If `processStripeRefund` takes too long, request might timeout
- If there's an uncaught error, response might not be sent
- If Stripe API succeeds but update fails, form might hang

---

## Debugging Your Issue

### Check These Things:

1. **Server Logs**: Look for errors in `processStripeRefund` hook
   - Check if Stripe API call is completing
   - Check if refund record update is succeeding
   - Look for timeout errors

2. **Database**: Check if refund record exists
   ```sql
   SELECT * FROM refunds ORDER BY created_at DESC LIMIT 5;
   ```
   - If record exists but form hung: Hook completed but response failed
   - If record doesn't exist: Validation or save failed

3. **Stripe Dashboard**: Check refund status
   - If refund exists: Stripe API succeeded
   - If refund doesn't exist: Stripe API failed or wasn't called

4. **Network Tab**: Check request timing
   - How long does the request take?
   - Is there a timeout?
   - What's the response status?

### Common Issues:

1. **Timeout**: Stripe API call takes > 30 seconds
   - **Solution**: Move Stripe processing to background job or API endpoint

2. **Missing Fields**: Auto-population fails silently
   - **Solution**: Check logs for auto-population errors

3. **Error in Hook**: Uncaught error prevents response
   - **Solution**: Add more error handling, ensure all errors are caught

4. **Race Condition**: Hook tries to update before save completes
   - **Solution**: Add retry logic or delay

---

## Recommended Fix

**Option 1: Move Stripe Processing to Background** (Best)
- Create refund record immediately
- Queue Stripe processing as background job
- Update refund status when Stripe completes

**Option 2: Use API Endpoint Instead** (Quick Fix)
- Don't create refunds directly in admin UI
- Use `/api/refunds/process` endpoint
- This already works correctly

**Option 3: Add Timeout Handling** (Medium Fix)
- Add timeout wrapper around Stripe API call
- Return response immediately, process in background
- Update refund status asynchronously

**Option 4: Fix Hook Error Handling** (Debug First)
- Ensure all errors are caught
- Add logging at every step
- Return response even if Stripe fails

---

## Code References

### Main Files:
- `src/collections/Refunds/index.ts` - Collection config and hooks
- `src/collections/Refunds/hooks/processStripeRefund.ts` - Stripe processing
- `src/collections/Refunds/hooks/autoPopulateRefundFields.ts` - Auto-population
- `src/collections/Refunds/hooks/validateRefund.ts` - Validation
- `src/collections/Refunds/hooks/updateOrderAfterRefund.ts` - Order updates
- `src/lib/stripe/refunds.ts` - Stripe API calls
- `src/app/(app)/api/refunds/process/route.ts` - API endpoint (alternative method)

### Client Components:
- `src/components/admin/AutoPopulateTransaction/index.tsx` - Auto-populate UI component
- `src/components/admin/ConditionalAmountField/index.tsx` - Amount field component

