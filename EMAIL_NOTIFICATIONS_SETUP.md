# Email Notifications Setup Guide

This guide will help you set up email notifications for your event management platform using Resend.

## Prerequisites

1. A Resend account (sign up at https://resend.com)
2. A verified domain for sending emails

## Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Create a new account or sign in
3. Complete the email verification process

## Step 2: Verify Your Domain

**Important**: You must verify your domain before sending emails.

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain name (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record (recommended)
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)
6. Click "Verify" in Resend dashboard

## Step 3: Create API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "Event Platform Notifications")
4. Select permissions:
   - **Emails**: Send access
5. Click "Create"
6. Copy the API key (starts with `re_`)
7. **Important**: Save this key securely - you won't be able to see it again!

## Step 4: Add API Key to Your Project

The API key needs to be added as a secret to your Lovable Cloud environment:

1. In your Lovable project, the AI will prompt you to add the `RESEND_API_KEY` secret
2. When prompted, paste your Resend API key
3. Click "Save"

Alternatively, you can ask the AI: "Add RESEND_API_KEY secret for email notifications"

## Step 5: Update Email Template

Edit the edge function `supabase/functions/send-notification-email/index.ts`:

1. Find this line:
   ```typescript
   from: "Events <notifications@yourdomain.com>",
   ```

2. Replace `yourdomain.com` with your verified domain:
   ```typescript
   from: "Events <notifications@yourcustomdomain.com>",
   ```

## Step 6: Test Email Notifications

1. Log in to your event platform
2. Go to **My Events** page
3. Click **Notifications** in the dashboard
4. Click **Preferences** button (top right of notification feed)
5. Configure your email preferences:
   - Set email frequency to "Instant"
   - Enable email notifications for the types you want
6. Click **Save Preferences**

## Step 7: Trigger a Test Notification

To test email notifications:

1. Create a test event
2. Share the event link with someone (or use incognito mode)
3. Have them:
   - Leave a comment (requires RSVP as attending/maybe)
   - Send a message to the host
   - Make a payment contribution
4. Check your email inbox for the notification

## Email Notification Types

The system sends instant email notifications for:

- 💰 **Payment Verifications**: When a guest submits a payment that needs verification
- ✉️ **Guest Messages**: When someone messages the event host
- 💬 **New Comments**: When a guest leaves a comment on the event page
- 👥 **RSVP Updates**: When guests RSVP or change their RSVP status
- 📦 **Item Claims**: When guests claim or unclaim items

## Email Frequency Options

- **Instant**: Emails sent immediately when notifications occur (recommended for important updates)
- **Daily Digest**: All notifications bundled into one daily email
- **Weekly Digest**: All notifications bundled into one weekly email
- **Never**: No email notifications (only in-app notifications)

## Troubleshooting

### Emails Not Sending

1. **Verify domain is confirmed**: Check https://resend.com/domains
2. **Check API key**: Ensure `RESEND_API_KEY` is correctly set in secrets
3. **Verify "from" address**: Must use your verified domain
4. **Check spam folder**: Emails might be filtered
5. **Review edge function logs**: Check for errors in the Lovable Cloud logs

### DNS Records Not Verifying

- Wait at least 1 hour for DNS propagation
- Use https://mxtoolbox.com to check if records are visible
- Ensure records are added to the root domain, not a subdomain (unless using subdomain)

### "onboarding@resend.dev" in From Address

This is Resend's default test address. You can use it for development, but for production:
1. Verify your own domain
2. Update the edge function with your domain

## Cost Considerations

Resend pricing (as of 2024):
- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Paid Plans**: Start at $20/month for higher volume

For most small to medium events, the free tier is sufficient.

## SMS Notifications (Coming Soon)

SMS notifications will require:
- Twilio account setup
- Phone number verification
- Additional costs per SMS sent

This feature is planned for a future release.

## Support

For issues with:
- Resend service: https://resend.com/support
- Email setup: Contact your domain registrar
- Platform integration: Ask the AI assistant

## Security Best Practices

1. ✅ Never commit API keys to version control
2. ✅ Use environment variables/secrets for all sensitive data
3. ✅ Verify your domain before sending production emails
4. ✅ Monitor email sending quotas in Resend dashboard
5. ✅ Regularly review and rotate API keys

---

**Last Updated**: 2024
**Resend Documentation**: https://resend.com/docs
