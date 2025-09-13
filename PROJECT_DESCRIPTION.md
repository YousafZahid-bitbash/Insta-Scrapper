# Insta-Scrapper Project Description

## Overview
Insta-Scrapper is a serverless, production-grade Instagram data extraction platform built with Next.js (App Router), Supabase, and Vercel. It automates the extraction of followers, followings, likers, commenters, posts, and hashtag clips from Instagram, supporting chunked, resumable, and secure job processing. The system is designed for reliability, scalability, and type safety, leveraging Vercel cron jobs for scheduled, automated background work.

## Core Extraction Module

### Architecture
- **Serverless API Worker:** The main extraction logic is implemented as a serverless API route (`/api/extractions/process`). This route is triggered by a Vercel cron job, which polls for pending or in-progress extraction jobs in the database.
- **Job Model:** Each extraction job is stored in the `extractions` table in Supabase, with fields for type (followers, followings, likers, etc.), target usernames/URLs, filters, progress, and status.
- **Chunked & Resumable:** Extractions are performed in chunks (pages), allowing for large jobs to be processed incrementally and safely resumed if interrupted. The worker updates job progress and next-page cursors after each chunk.
- **Type Safety:** All extraction logic is written in TypeScript with strict types and type guards, ensuring robust, maintainable code.

### Extraction Flow
1. **Job Scheduling:**
   - A Vercel cron job (configured in `vercel.json`) triggers the `/api/extractions/process` endpoint every minute using a GET request.
2. **Job Selection:**
   - The worker queries Supabase for the next pending or in-progress job, ordered by request time.
3. **Extraction Dispatch:**
   - Based on the job's `extraction_type`, the worker calls the appropriate extraction function (followers, followings, likers, commenters, posts, hashtags).
   - Each function supports chunked extraction, progress tracking, and filter application.
4. **Chunk Processing:**
   - The worker fetches a chunk of data from the Hiker API, applies filters, and saves results to Supabase.
   - Progress and next-page cursors are updated in the job record.
5. **Completion:**
   - When all data is extracted (no more pages or progress threshold met), the job is marked as completed.
   - Errors are logged and the job is marked as failed if any step fails.

### Security
- The endpoint is protected by a secret (checked in the POST handler). For cron jobs (GET), you can add a similar check if desired.
- All environment variables (API keys, secrets) are managed via Vercel's environment settings.

### Extensibility
- New extraction types can be added by implementing a new function and updating the worker's dispatch logic.
- The chunked, resumable design makes it easy to scale and recover from failures.

## Key Files
- `src/app/api/extractions/process/route.ts`: Serverless worker endpoint, main extraction logic.
- `src/services/hikerApi.ts`: All extraction functions, type definitions, and Supabase integration.
- `vercel.json`: Cron job schedule and endpoint configuration.

## Summary
This architecture enables reliable, automated, and scalable Instagram data extraction, with a strong focus on type safety, error handling, and operational transparency. The core extraction module is designed for easy maintenance and future growth.
