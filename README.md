# Ads Galaxy-style Telegram Bot — Vercel Starter

A Telegram advertising marketplace starter inspired by the supplied screenshots. It includes language selection (English/Russian buttons), Publisher Dashboard, Advertiser Dashboard, Referral Program, campaign submission, channel submission for manual review, and admin approval/rejection commands.

This is a starter, not a complete live advertising exchange. It does not automatically post ads, verify channel ownership, process deposits/payouts, or calculate earnings. Those require real provider integrations and moderation controls.

## Deploy
1. Create a Telegram bot via @BotFather.
2. Create an Upstash Redis database.
3. Upload this folder to GitHub and import it into Vercel.
4. In Vercel Environment Variables set every value from `.env.example`.
5. Redeploy after setting variables.
6. Configure webhook (replace placeholders):
`https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://YOUR-PROJECT.vercel.app/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
Use a webhook secret made only of A-Z, a-z, 0-9, underscore or hyphen. Never share your bot token.

## Admin setup
Set `ADMIN_TELEGRAM_IDS` to your numeric Telegram user ID(s), comma-separated. In the bot, send `/admin`.
- `/adminstats` or `/pending`: list pending campaign IDs
- `/approve CAMPAIGN_ID`
- `/reject CAMPAIGN_ID`
- `/campaign https://example.com | Campaign title | 10` — submit campaign for review
- `/channel @yourchannel` — submit a channel for manual review

## What is not yet enabled
- No automatic ad posting or impression/click rewards
- No real advertiser deposits or publisher payouts
- No automatic channel ownership verification
- No paid premium/referral cash-out
Use real payment-provider webhooks, fraud checks, consent, channel-admin verification, and audited accounting before enabling money flows. Avoid fake clicks, spam, deceptive offers, or ads for prohibited products.


## Security note for this configuration
The supplied bot token and Upstash REST token were shared in chat and must be considered exposed. Revoke/regenerate the Telegram token with @BotFather and rotate the Upstash token before deploying. Do not paste secrets into source code, README, screenshots, or GitHub commits. Add the new values only as Vercel Environment Variables.
Configured admin ID: `6803403343`.
Official channel: `https://t.me/ronjumodz`.
Support/owner link: `https://t.me/ronjumodz_Ownerinfo`.
Bot username configured in the example: `nagadbanbot` (confirm the actual username with BotFather).
