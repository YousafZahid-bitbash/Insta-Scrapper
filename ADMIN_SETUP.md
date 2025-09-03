# Admin Dashboard Setup

## 1. Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Add admin role to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Make yourself an admin (replace with your actual email)
UPDATE public.users SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';
```

## 2. Install Dependencies

The admin dashboard uses the existing dependencies. Make sure you have:

- Next.js 15+
- Supabase client
- JWT for authentication

## 3. Access the Admin Dashboard

1. **Login as admin**: Use an account with `is_admin = true`
2. **Visit admin routes**:
   - Dashboard: `/admin`
   - Users: `/admin/users`
   - Stats: `/admin/stats`

## 4. Features

### Admin Dashboard (`/admin`)
- User statistics overview
- Recent user registrations
- System metrics (total users, active users, coins, etc.)

### Users Management (`/admin/users`)
- View all users with pagination
- Search users by email/username
- Edit user coin balances
- View user status and activity
- Quick coin additions (+100, +500)

### API Endpoints
- `GET /api/admin/users` - Get paginated user list
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/update-coins` - Update user coin balance

## 5. Security

- Admin routes are protected by middleware
- Only users with `is_admin = true` can access
- JWT token verification required
- Automatic redirect to login if not authenticated
- Automatic redirect to dashboard if not admin

## 6. Making a User Admin

To make a user admin, run this SQL in Supabase:

```sql
UPDATE public.users 
SET is_admin = TRUE 
WHERE email = 'user@example.com';
```

## 7. Usage

1. Set yourself as admin in database
2. Login to your account
3. Navigate to `/admin`
4. Manage users and view statistics

The admin panel is responsive and works on mobile devices.
