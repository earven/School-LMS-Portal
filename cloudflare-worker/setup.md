# Telegram Bot → Memo Stocker Deployment Guide

This guide describes how to deploy the Cloudflare Worker that connects your Telegram Bot to your school's LMS portal.

---

## 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A free [Cloudflare Account](https://dash.cloudflare.com/).

---

## 2. Setup wrangler and KV Namespace
1. Open your terminal at the root of the project.
2. Install the Cloudflare Wrangler CLI globally (if not already installed):
   ```bash
   npm install -g wrangler
   ```
3. Log in to your Cloudflare account:
   ```bash
   wrangler login
   ```
   *This will open a browser window to authenticate.*
4. Navigate to the `cloudflare-worker` directory:
   ```bash
   cd cloudflare-worker
   ```
5. Create the KV Namespace for bot session state:
   ```bash
   wrangler kv:namespace create BOT_SESSIONS
   ```
   *Copy the generated `id` from the output.*
6. Open your [wrangler.toml](file:///d:/coding_files/School-LMS-Portal/cloudflare-worker/wrangler.toml) file and replace `"PLACEHOLDER_KV_ID"` with the generated ID:
   ```toml
   id = "your_actual_kv_namespace_id_here"
   ```

---

## 3. Set Up Environment Secrets
Wrangler securely stores secrets in your Cloudflare environment. Run the following commands in the `cloudflare-worker` directory to add them. You will be prompted to type/paste each value:

1. **Telegram Bot Token** (Use your provided token):
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```
   *Value to input:* `8895688873:AAFrKeyi-eTc7vJkAEpIgQPECPXApVtzkeA`

2. **Admin Telegram ID** (Use your provided ID):
   ```bash
   wrangler secret put ADMIN_TELEGRAM_ID
   ```
   *Value to input:* `8879936917`

3. **Firebase API Key**:
   ```bash
   wrangler secret put FIREBASE_API_KEY
   ```
   *Value to input:* (Your Firebase Web API Key)

4. **Firebase Project ID**:
   ```bash
   wrangler secret put FIREBASE_PROJECT_ID
   ```
   *Value to input:* (Your Firebase Project ID, e.g. `school-lms-portal` or `school-lms-portal-xxxx`)

5. **LMS Admin Email**:
   ```bash
   wrangler secret put ADMIN_EMAIL
   ```
   *Value to input:* (An administrator email in your LMS portal)

6. **LMS Admin Password**:
   ```bash
   wrangler secret put ADMIN_PASSWORD
   ```
   *Value to input:* (The password for the admin email above)

---

## 4. Deploy the Worker
From the `cloudflare-worker` directory, run:
```bash
wrangler deploy
```
*Take note of the deployment URL printed in your terminal (e.g. `https://school-lms-memo-bot.username.workers.dev`).*

---

## 5. Register the Webhook with Telegram
To tell Telegram to send bot messages to your Cloudflare Worker, send a request to the Telegram Bot API using your browser or terminal (replace `<YOUR_WORKER_URL>` with your deployment URL):

```bash
curl -F "url=<YOUR_WORKER_URL>" https://api.telegram.org/bot8895688873:AAFrKeyi-eTc7vJkAEpIgQPECPXApVtzkeA/setWebhook
```

Or copy this link directly into your web browser address bar:
`https://api.telegram.org/bot8895688873:AAFrKeyi-eTc7vJkAEpIgQPECPXApVtzkeA/setWebhook?url=<YOUR_WORKER_URL>`

---

## 6. Testing the Bot
1. Open Telegram and message your bot: `https://t.me/SchoolLMSMemoBot` (or your bot's username).
2. Send `/help` to see if it responds.
3. Send a test link:
   ```
   OM-014 s.2026 – Bridge Project TWG
   https://drive.google.com/file/d/abc123/view
   ```
4. Respond with `2` for **DepEd Memo**.
5. Check your LMS portal's Memo Stocker page to confirm it appeared automatically!
