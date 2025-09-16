# Testing Mode for Hiker API

This document explains how to use the testing mode for the Hiker API when you don't have sufficient funds in your Hiker API account.

## Overview

The testing mode allows you to continue development and testing of the extraction functionality without hitting the actual Hiker API. When enabled, the `userByUsernameV1` function will return mock data instead of making real API calls.

## How to Enable Testing Mode

Set the environment variable `HIKER_API_TESTING_MODE` to `true`:

### Option 1: Environment Variable
```bash
export HIKER_API_TESTING_MODE=true
```

### Option 2: In your .env file
```env
HIKER_API_TESTING_MODE=true
```

### Option 3: In your deployment environment
Add the environment variable to your deployment platform (Vercel, Netlify, etc.)

## How to Disable Testing Mode

To disable testing mode and use the real Hiker API:

### Option 1: Remove the environment variable
```bash
unset HIKER_API_TESTING_MODE
```

### Option 2: Set to false in .env file
```env
HIKER_API_TESTING_MODE=false
```

## Mock Data Structure

When testing mode is enabled, the `userByUsernameV1` function returns mock data with the following structure:

```typescript
{
  "pk": "mock_username_randomstring",
  "username": "username",
  "full_name": "Mock User username",
  "is_private": true/false,
  "profile_pic_url": "https://via.placeholder.com/150/...",
  "profile_pic_url_hd": "https://via.placeholder.com/300/...",
  "is_verified": true/false,
  "media_count": 10-1009,
  "follower_count": 100-10099,
  "following_count": 50-2049,
  "biography": "This is a mock biography for username. Testing data for Instagram scraper.",
  "external_url": "https://example.com/username" or "",
  "account_type": 0 or 1,
  "is_business": true/false,
  "public_email": "username@example.com" or "",
  "contact_phone_number": "+1234567890" or "",
  "public_phone_country_code": "+1" or "",
  "public_phone_number": "234567890" or "",
  "business_contact_method": "EMAIL" or "",
  "business_category_name": "Business" or "",
  "category_name": "Category" or "",
  "category": "category" or "",
  "address_street": "123 Mock Street" or "",
  "city_id": "mock_city_id" or "",
  "city_name": "Mock City" or "",
  "latitude": 40.7128 or 0,
  "longitude": -74.0060 or 0,
  "zip": "10001" or "",
  "instagram_location_id": "mock_location_id" or "",
  "interop_messaging_user_fbid": "mock_fbid" or ""
}
```

## Features

- **Realistic Data**: Mock data includes realistic ranges for follower counts, media counts, etc.
- **Randomized Values**: Each call generates slightly different data to simulate real API responses
- **API Delay Simulation**: Includes a small delay (100-300ms) to simulate real API response times
- **All Required Fields**: Includes all fields required by the HikerUser type
- **Dynamic Username**: Uses the actual username provided in the request

## Important Notes

⚠️ **CRITICAL**: Remember to disable testing mode before deploying to production!

- Testing mode is designed for development and testing only
- Mock data is generated randomly and may not reflect real user data
- The mock data includes placeholder images and example contact information
- Always test with real API data before production deployment

## Usage in Extraction Process

When testing mode is enabled, the extraction process will work normally but use mock data instead of real Instagram data. This allows you to:

1. Test the complete extraction workflow
2. Verify filtering logic works correctly
3. Test pagination and batching
4. Debug extraction issues without API costs
5. Develop new features without API limitations

## Logging

When testing mode is active, you'll see log messages like:
```
[hikerApi] TESTING MODE: userByUsernameV1 called with: username
[hikerApi] TESTING MODE: Returning mock data for: username
[hikerApi] TESTING MODE: Mock data generated: {...}
```

This helps you identify when testing mode is active and track the mock data generation.
