---
description: How to rotate compromised API keys and secrets
---

# Rotating Compromised Secrets

Since your `backend/.env.local` file was committed to git, your secrets are potentially exposed. Follow these steps to rotate them immediately.

## 1. Rotate Google API Key (Gemini)

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the API key that matches the one in your `.env` file (likely named "API key 1" or similar).
3. Click on the name of the key to edit it.
4. Click **Regenerate Key** (usually at the top or bottom) OR create a **Create Credentials > API key** to get a fresh one, then delete the old one.
5. Copy the new key string.
6. Update your local `backend/.env` file:
   ```bash
   GOOGLE_API_KEY=your_new_key_here
   ```

## 2. Rotate Supabase Service Role Key

**Warning:** Rotating the JWT secret will invalidate **ALL** your existing API keys (both `anon` and `service_role`) and log out all users.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Go to **Project Settings** (cog icon) > **API**.
4. Scroll down to the **JWT Settings** section.
5. Click **Generate a new JWT secret**.
6. Once generated, your `anon` and `service_role` keys will also be updated automatically.
7. Copy the new `service_role` key (secret).
8. Update your local `backend/.env` file:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
   ```
9. You may also need to update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local` if you are using it there.

## 3. Verify

1. Restart your backend server.
2. Try uploading a file or generating a test to ensure the new keys are working.
