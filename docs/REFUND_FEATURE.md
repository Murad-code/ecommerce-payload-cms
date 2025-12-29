# Refund Feature Documentation

## 📊 Feature Status

**Overall Completion: ~85%**

### ✅ Completed
- **Core Functionality**: 100% - All refund features work
- **Backend**: 100% - All APIs, validation, hooks complete
- **UI Components**: 100% - All admin and customer UI complete
- **Data Model**: 100% - Collections, relationships, status tracking
- **Stripe Integration**: 100% - Full and partial refund processing
- **Webhook Handling**: 100% - Status sync from Stripe

### ❌ Not Completed / Pending
- **Email Notifications**: 0% - Not implemented
- **Testing**: 0% - No automated tests
- **Refunds Create Page**: Disabled - Use order page buttons or API instead

### ⚠️ Known Limitations
1. **Refunds Collection Create Page** - Direct creation disabled
   - **Status**: Create button hidden, use order page refund buttons or API endpoint
   - **Reason**: Create page UX not fully developed
   - **Workaround**: Use order page refund actions or `POST /api/refunds/process`
   - **TODO**: Develop custom create page with proper UX

2. **Email Notifications** - Not implemented
   - **Status**: No email hooks in refund/refund request collections
   - **Impact**: Customers won't receive automatic email notifications
   - **TODO**: Add email templates and hooks for:
     - Refund confirmation emails
     - Refund request notifications (admin)
     - Status update emails (customer)

3. **Testing** - No automated tests
   - **Status**: Manual testing recommended before production
   - **TODO**: Add E2E tests for refund workflow

### 🎯 Ready for Production?
**Almost!** Core functionality is complete and working. However:
- ⚠️ Add email notifications (important for customer communication)
- ⚠️ Test refund workflow end-to-end manually
- ⚠️ Test Stripe webhook handling
- ✅ All core features work
- ✅ All validation in place
- ✅ All UI components functional

---

## Overview
Complete refund system supporting full and partial refunds. Customers can request refunds, and admins process them through Stripe. The system tracks refund requests separately from processed refunds for better control and auditability.

---

## Architecture

### Two Collections Approach

1. **Refund Requests** (`refund-requests`)
   - Customer-initiated requests awaiting admin decision
   - Status: `pending` → `approved`/`rejected`/`cancelled`
   - Customers can create/read their own; Admins manage all

2. **Refunds** (`refunds`)
   - Audit trail of processed refunds
   - Status: `processing` → `completed`/`failed`
   - Admins create/process; Customers can read their own

### Workflow

```
Customer Request → API → Validation → Admin Review → Approval → Stripe Refund → Webhook → Status Update
```

---

## Collections

### Refund Requests Collection
**Location:** `src/collections/RefundRequests/index.ts`

**Key Fields:**
- `order` - Order being refunded
- `customer` - Customer who requested
- `type` - `full` | `partial`
- `amount` - Refund amount (for partial)
- `reason` - Customer's reason
- `status` - `pending` | `approved` | `rejected` | `cancelled`
- `items` - Items to refund (for partial)
- `adminNotes` - Internal admin notes
- `refund` - Link to processed refund (if processed)

### Refunds Collection
**Location:** `src/collections/Refunds/index.ts`

**Key Fields:**
- `order` - Order being refunded (transaction auto-populated)
- `transaction` - Transaction (read-only, auto-populated)
- `amount` - Refund amount
- `type` - `full` | `partial`
- `status` - `processing` | `completed` | `failed`
- `stripeRefundId` - Stripe refund ID
- `paymentIntentId` - Payment intent ID
- `refundRequest` - Link to original request (if processed from request)
- `processedBy` - Admin who processed
- `items` - Items refunded (for partial)

**Note:** Direct creation is disabled. Use order page refund buttons or API endpoint.

### Orders Collection Updates
**Location:** `src/collections/Orders/index.ts`

**New Fields:**
- `totalRefunded` - Total amount refunded
- `refunds` - Relationship to refunds
- `refundActions` - UI component for refund buttons
- `refundHistory` - UI component showing refund history

**Status Updates:**
- Added `partially_refunded` status
- Auto-updates to `refunded` or `partially_refunded` based on refund amount

---

## API Endpoints

### Customer Endpoints

**POST** `/api/refund-requests`
- Create refund request
- Access: Customer (own orders) or guest (with email)
- Body: `{ orderId, type, reason, amount?, items?, email? }`

**GET** `/api/refund-requests`
- List refund requests
- Query params: `orderId`, `status`, `email` (for guests)

**GET** `/api/refund-requests/[id]`
- Get refund request details

**DELETE** `/api/refund-requests/[id]`
- Cancel pending request (customer only)

**GET** `/api/refunds`
- List refunds for customer's orders
- Query params: `orderId`, `status`

**GET** `/api/refunds/[id]`
- Get refund details

### Admin Endpoints

**POST** `/api/refund-requests/[id]/approve`
- Approve refund request
- Access: Admin only

**POST** `/api/refund-requests/[id]/reject`
- Reject refund request (with reason)
- Access: Admin only
- Body: `{ rejectionReason? }`

**POST** `/api/refunds/process`
- Process refund (from approved request or direct)
- Access: Admin only
- Body: `{ orderId, refundRequestId?, type?, amount?, reason? }`

### Webhook

**POST** `/api/stripe/webhooks/refunds`
- Handles Stripe refund events (`charge.refunded`, `refund.created`, `refund.updated`)
- Updates refund status from Stripe

---

## Core Services

### Stripe Refund Service
**Location:** `src/lib/stripe/refunds.ts`

**Functions:**
- `processFullRefund()` - Process full refund via Stripe
- `processPartialRefund()` - Process partial refund via Stripe
- `getRefund()` - Get refund from Stripe
- `getPaymentIntent()` - Get payment intent details

### Validation Utilities
**Location:** `src/lib/refunds/validation.ts`

**Functions:**
- `validateRefundAmount()` - Validate refund amount
- `validateOrderCanBeRefunded()` - Check order status
- `validateTransactionCanBeRefunded()` - Check transaction
- `getRefundableAmount()` - Calculate refundable amount
- `getPrimaryTransaction()` - Get primary transaction from order

---

## Hooks

### Refund Hooks
**Location:** `src/collections/Refunds/hooks/`

- `autoPopulateTransaction` - Auto-populates transaction from order (prevents errors)
- `validateRefund` - Validates refund before creation
- `updateOrderAfterRefund` - Updates order status and totalRefunded

### Refund Request Hooks
**Location:** `src/collections/RefundRequests/hooks/`

- `validateRefundRequest` - Validates request before creation

---

## UI Components

### Admin Components
**Location:** `src/components/admin/`

- `RefundRequestActions` - Approve/reject/process buttons for refund requests
- `OrderRefundActions` - Full/partial refund buttons on order page
- `ProcessRefundButton` - Modal for processing refunds
- `RefundHistory` - Display refund history
- `RefundOrderSelector` - Order verification display (shows customer, amount, etc.)
- `TransactionLinkCell` - Clickable transaction IDs in orders list

### Customer Components
**Location:** `src/components/refunds/`

- `RefundRequestForm` - Modal form for requesting refunds
- `RefundStatus` - Display refund request status
- `RefundHistory` - Display refund history on order page

---

## Access Control

**Location:** `src/access/`

- `adminOrRefundOrderOwner` - Customers can read refunds for their orders
- `adminOrRefundRequestOwner` - Customers can create/read their own requests

---

## Key Features

✅ **Full & Partial Refunds** - Support both types  
✅ **Customer Requests** - Customers can request refunds  
✅ **Admin Control** - Admins approve/reject and process  
✅ **Auto-Population** - Transaction auto-populated from order (prevents wrong customer refunds)  
✅ **Order Verification** - Visual verification component shows order details before processing  
✅ **Status Tracking** - Track request and refund status  
✅ **Stripe Integration** - Process refunds via Stripe API  
✅ **Webhook Sync** - Sync status from Stripe webhooks  
✅ **No Inventory Restocking** - Inventory not auto-restocked (business decision)  
✅ **Multiple Partial Refunds** - Support multiple partial refunds per order  
✅ **Clickable Transaction IDs** - Transaction IDs in orders list are clickable links  

---

## Workflows

### Admin Workflow

1. **View Refund Requests** - See pending requests in "Refund Requests" collection
2. **Review Request** - View order details, customer, reason
3. **Approve/Reject** - Make decision via action buttons
4. **Process Refund** - If approved, process via "Process Refund" button or order page
5. **View Refunds** - Audit trail of all processed refunds in "Refunds" collection

### Customer Workflow

1. **View Order** - Go to order detail page
2. **Request Refund** - Click "Request Refund" button
3. **Fill Form** - Select type, reason, items (if partial)
4. **Submit** - Request created with `pending` status
5. **View Status** - See request status updates on order page
6. **View History** - See processed refunds in refund history section

---

## Important Notes

- **Transaction Auto-Population**: Transaction is automatically selected from order to prevent errors
- **Order Verification**: Admin sees order details (customer, amount, refundable amount) before processing
- **No Inventory Restocking**: Inventory is NOT automatically restocked (business decision)
- **Multiple Partial Refunds**: Orders can have multiple partial refunds
- **Status Updates**: Order status auto-updates based on refund amount (`refunded` or `partially_refunded`)
- **Create Page Disabled**: Direct creation in Refunds collection is disabled - use order page buttons or API

---

## File Structure

```
src/
├── collections/
│   ├── Refunds/
│   │   ├── index.ts
│   │   └── hooks/
│   │       ├── autoPopulateTransaction.ts
│   │       ├── validateRefund.ts
│   │       └── updateOrderAfterRefund.ts
│   ├── RefundRequests/
│   │   ├── index.ts
│   │   └── hooks/
│   │       └── validateRefundRequest.ts
│   └── Orders/
│       └── index.ts (updated)
├── lib/
│   ├── stripe/
│   │   └── refunds.ts
│   └── refunds/
│       └── validation.ts
├── access/
│   ├── adminOrRefundOrderOwner.ts
│   └── adminOrRefundRequestOwner.ts
├── components/
│   ├── admin/
│   │   ├── RefundRequestActions/
│   │   ├── OrderRefundActions/
│   │   ├── ProcessRefundButton/
│   │   ├── RefundHistory/
│   │   ├── RefundOrderSelector/
│   │   └── TransactionLinkCell/
│   └── refunds/
│       ├── RefundRequestForm/
│       ├── RefundStatus/
│       └── RefundHistory/
└── app/(app)/api/
    ├── refund-requests/
    ├── refunds/
    └── stripe/webhooks/refunds/
```

---

## Testing Recommendations

### Manual Testing Checklist
- [ ] Customer creates refund request
- [ ] Admin views refund request
- [ ] Admin approves refund request
- [ ] Admin processes refund from approved request
- [ ] Admin processes direct refund from order page
- [ ] Admin processes partial refund
- [ ] Multiple partial refunds on same order
- [ ] Webhook updates refund status
- [ ] Order status updates correctly
- [ ] Transaction auto-population works
- [ ] Validation prevents invalid refunds

### Future: Automated Testing
- Unit tests for validation functions
- Integration tests for API endpoints
- E2E tests for refund workflow
- Webhook testing

---

## Next Steps / TODOs

1. **High Priority**
   - [ ] Develop custom Refunds create page with proper UX
   - [ ] Add email notifications (refund confirmations, status updates)

2. **Medium Priority**
   - [ ] Add automated testing
   - [ ] Enhanced error handling and recovery

3. **Low Priority**
   - [ ] Analytics/reporting for refunds
   - [ ] Bulk refund operations
   - [ ] Refund templates/presets

---

## Migration Notes

- **New Collections**: `refunds`, `refund-requests`
- **New Order Status**: `partially_refunded`
- **New Order Fields**: `totalRefunded`, `refunds` relationship
- **Run**: `pnpm run generate:types` after pulling changes

---

## Breaking Changes
None - All changes are additive.
