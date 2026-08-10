# Operations checklist

## Required Vercel variables

- `GEMINI_API_KEY`: server-only Gemini key.
- `CRON_SECRET`: a long random secret used as `Authorization: Bearer <secret>` when invoking `/api/daily-summary`.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role key for the scheduled daily summary.

Also configure the existing `RESEND_API_KEY`, `SUMMARY_EMAIL_TO`, `TWELVE_DATA_API_KEY`, and `FINNHUB_API_KEY` when those features are enabled.

Without a verified custom domain, daily summaries use Resend's free test sender and `SUMMARY_EMAIL_TO` must be the email address used for the Resend account.

## Monitoring and backups

Use Vercel Logs and add an alert for repeated 5xx responses. Enable daily Point-in-Time Recovery or scheduled backups in Supabase, retain a monthly export outside the project, and test restores in a separate project.

## Scheduled daily summary

Invoke `GET /api/daily-summary` through a scheduler with the header `Authorization: Bearer <CRON_SECRET>`. Never expose this URL or secret in browser code.
