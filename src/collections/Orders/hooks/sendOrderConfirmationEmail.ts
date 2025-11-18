import type { CollectionAfterChangeHook } from 'payload'

import type { Order } from '@/payload-types'

export const sendOrderConfirmationEmail: CollectionAfterChangeHook<Order> = async ({
  doc,
  previousDoc,
  req: { payload },
  operation,
}) => {
  payload.logger.info(`Order hook triggered: operation=${operation}, orderID=${doc.id}, previousDoc=${previousDoc ? `exists (id: ${previousDoc.id})` : 'null'}`)

  // Only send email when order is first created (not on updates)
  // Trust the operation parameter - if it says 'create', send the email
  if (operation !== 'create') {
    payload.logger.info(`Skipping email - operation is ${operation}, not 'create'`)
    return doc
  }

  // If operation is 'create', send the email regardless of previousDoc
  // The ecommerce plugin may have previousDoc set, but if operation is 'create', it's a new order

  // Get the email address to send to
  let emailTo: string | undefined

  if (doc.customerEmail) {
    emailTo = doc.customerEmail
  } else if (doc.customer && typeof doc.customer === 'object' && doc.customer.email) {
    emailTo = doc.customer.email
  }

  if (!emailTo) {
    payload.logger.warn(`No email address found for order confirmation. Order ID: ${doc.id}, customerEmail: ${doc.customerEmail}, customer: ${doc.customer ? 'exists' : 'null'}`)
    return doc
  }

  // Verify email adapter is configured
  if (!payload.email) {
    payload.logger.error('Email adapter is not configured!')
    return doc
  }

  payload.logger.info(`Preparing to send order confirmation email to ${emailTo} for order #${doc.id}`)

  try {
    // Get order details for the email
    const orderID = doc.id
    const orderTotal = doc.amount
    const currency = doc.currency || 'GBP'

    // Format the order total
    const formattedTotal = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format((orderTotal || 0) / 100) // Convert from cents/pence to currency units

    payload.logger.info(`Sending email via Resend adapter to ${emailTo}`)

    // Send the email
    const emailResult = await payload.email.sendEmail({
      to: emailTo,
      subject: `Order Confirmation #${orderID}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Thank you for your order!</h1>
            <p>Your order has been confirmed and we're getting it ready for you.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #2c3e50;">Order Details</h2>
              <p><strong>Order Number:</strong> #${orderID}</p>
              <p><strong>Total:</strong> ${formattedTotal}</p>
              <p><strong>Status:</strong> ${doc.status || 'Processing'}</p>
            </div>
            
            <p>You can view your order details by visiting:</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/orders/${orderID}${doc.customerEmail ? `?email=${encodeURIComponent(doc.customerEmail)}` : ''}" 
                 style="color: #007bff; text-decoration: none;">
                View Order
              </a>
            </p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please don't hesitate to contact us.
            </p>
          </body>
        </html>
      `,
    })

    payload.logger.info(
      `✅ Order confirmation email sent successfully to ${emailTo} for order #${orderID}. Result: ${JSON.stringify(emailResult || 'success')}`,
    )
  } catch (error) {
    payload.logger.error({
      err: error,
      message: `❌ Failed to send order confirmation email for order #${doc.id}`,
    })

    // Log more details about the error
    if (error instanceof Error) {
      payload.logger.error(`Error details: ${error.message}`)
      payload.logger.error(`Error stack: ${error.stack}`)
    }

    // Don't throw - we don't want to break the order creation process
  }

  return doc
}

