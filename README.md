# Ads Galaxy Full Bot Starter

Includes a responsive web dashboard inspired by your screenshots and Telegram webhook API files.

## Deploy
1. Upload all files in this folder to the GitHub repository connected to Vercel.
2. Set environment variables in Vercel Project Settings → Environment Variables.
3. Redeploy.
4. Set Telegram webhook to `https://YOUR-PROJECT.vercel.app/api/telegram` with `secret_token` exactly matching `TELEGRAM_WEBHOOK_SECRET`.
5. Add bot as channel administrator with permission to post.
6. Test with a private channel first.

## Important functionality boundaries
The web dashboard is a front-end starter. It does not currently authenticate Telegram Mini App users, synchronize dashboard data from Redis, process withdrawals, issue referral rewards, track ad clicks/impressions, or integrate payments. Displayed balances are placeholders and are not real funds. The Telegram API code supports admin-reviewed photo campaign posting to verified channels, subject to the configured bot permissions and environment variables. Test and audit before production.
