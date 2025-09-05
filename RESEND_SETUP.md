# Resend Email Integration Setup Guide

## Overview
This guide explains how to set up and use the Resend email integration for sending ban/unban notification emails to users when admins change their account status.

## Prerequisites

### 1. Resend Account Setup
1. Create an account at [Resend](https://resend.com)
2. [Create an API key](https://resend.com/api-keys)
3. [Verify your domain](https://resend.com/domains) (recommended for production)

### 2. Environment Configuration
Add the following environment variables to your `.env.local` file:

```bash
# Resend Configuration
RESEND_API_KEY=your_resend_api_key_here

# App URL for internal API calls
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production Setup:**
```bash
# Production environment
RESEND_API_KEY=re_your_production_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Features Implemented

### 1. Automatic Email Notifications
- **Ban Notification**: Sent when admin bans a user (sets `is_active = false`)
- **Unban Notification**: Sent when admin unbans a user (sets `is_active = true`)

### 2. Professional Email Templates
- **BanNotificationTemplate**: Professional ban notification with support information
- **UnbanNotificationTemplate**: Welcome back email for unbanned users
- **Responsive Design**: Emails look great on all devices
- **Branded Styling**: Consistent with InstaScrapper branding

### 3. API Endpoints

#### `/api/admin/send-ban-email` (POST)
Sends ban/unban notification emails.

**Request Body:**
```json
{
  "userId": "user_uuid",
  "username": "john_doe",
  "email": "user@example.com",
  "isBanned": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ban notification email sent successfully",
  "emailId": "email_id_from_resend"
}
```

#### `/api/admin/toggle-user-status` (Enhanced)
Now automatically sends email notifications when user status changes.

## Email Templates

### Ban Notification Features:
- ✅ Clear suspension notice
- ✅ Explanation of what it means
- ✅ Support contact information
- ✅ Professional branding
- ✅ Appeals process guidance

### Unban Notification Features:
- ✅ Welcome back message
- ✅ Account reactivation confirmation
- ✅ Feature availability notice
- ✅ Terms reminder
- ✅ Support information

## Usage Flow

### 1. Admin Bans User
1. Admin clicks "Ban" button in admin panel
2. `toggle-user-status` API updates `is_active = false`
3. Automatically calls `send-ban-email` API
4. User receives ban notification email
5. Admin sees success message

### 2. Admin Unbans User
1. Admin clicks "Unban" button in admin panel
2. `toggle-user-status` API updates `is_active = true`
3. Automatically calls `send-ban-email` API with `isBanned = false`
4. User receives welcome back email
5. Admin sees success message

## Error Handling

### Email Service Not Configured
If `RESEND_API_KEY` is not set:
- Ban/unban operation still succeeds
- Email sending fails gracefully
- Error logged but doesn't affect user status change

### Email Delivery Failure
If Resend API fails:
- Ban/unban operation still succeeds
- Error logged with details
- Admin operation is not blocked

### Network Issues
Internal API call failures:
- User status change still succeeds
- Email notification may fail
- Logged for debugging

## Testing

### Development Testing
1. Set up Resend account and get API key
2. Add API key to `.env.local`
3. Test ban/unban functionality in admin panel
4. Check email delivery in Resend dashboard

### Production Checklist
- ✅ Verify domain in Resend
- ✅ Update `from` email address in API
- ✅ Set production `NEXT_PUBLIC_APP_URL`
- ✅ Test email delivery
- ✅ Monitor Resend dashboard for delivery status

## Customization

### Email Templates
Templates are located in:
- `src/components/email-templates/BanNotificationTemplate.tsx`
- `src/components/email-templates/UnbanNotificationTemplate.tsx`

### From Address
Update the `from` field in `send-ban-email/route.ts`:
```typescript
from: 'InstaScrapper <noreply@yourdomain.com>',
```

### Support Email
Update support email in templates:
```typescript
supportEmail: 'support@yourdomain.com'
```

## Security

### Admin Authentication
- All email APIs require admin JWT token
- Token validation before sending emails
- User verification before email sending

### Rate Limiting
Consider implementing rate limiting for email endpoints in production.

### Data Validation
- User data validation before email sending
- Email address format validation
- SQL injection prevention

## Monitoring

### Resend Dashboard
- Monitor email delivery rates
- Check bounce/spam rates
- View email analytics

### Application Logs
- Email sending success/failure
- API response times
- Error details for debugging

## Support

For issues with:
- **Resend API**: Check [Resend documentation](https://resend.com/docs)
- **Email templates**: Modify template files
- **Integration bugs**: Check application logs

## File Structure
```
src/
├── components/
│   └── email-templates/
│       ├── BanNotificationTemplate.tsx
│       └── UnbanNotificationTemplate.tsx
├── app/
│   └── api/
│       └── admin/
│           ├── send-ban-email/
│           │   └── route.ts
│           └── toggle-user-status/
│               └── route.ts
└── .env.example (environment template)
```

The integration is now complete and ready for production use! 🎉
