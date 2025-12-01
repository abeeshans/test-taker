---
description: How to rotate compromised API keys and secrets
---

# Rotating Compromised Secrets

If a secret (like your Supabase Service Role Key) has been exposed, you must rotate it immediately to prevent unauthorized access.

## 1. Rotate the Key in the Provider
For Supabase:
1.  Go to your Supabase Project Dashboard.
2.  Navigate to **Project Settings** > **API**.
3.  Scroll down to the **Project API keys** section.
4.  Find the `service_role` key (or `anon` key if that was exposed).
5.  Click **Generate new secret** (or "Rotate secret").
    *   *Note: This will immediately invalidate the old key. Your app will break until you update the configuration.*
6.  Copy the **new** key.

## 2. Update Local Environment
1.  Open your local `.env` or `.env.local` file.
2.  Replace the old key with the new one.
    ```env
    SUPABASE_KEY=your_new_key_here
    SUPABASE_SERVICE_ROLE_KEY=your_new_key_here
    ```
3.  **Ensure this file is in your `.gitignore`!**

## 3. Update Deployment Configuration (Google Cloud Run)
Since you are using Cloud Build with substitution variables:
1.  Go to the [Google Cloud Console Cloud Build Triggers page](https://console.cloud.google.com/cloud-build/triggers).
2.  Edit your trigger.
3.  Update the `_SUPABASE_KEY` (and `_SUPABASE_SERVICE_ROLE_KEY` if you use it) variable with the new key.
4.  Save the trigger.

## 4. Redeploy
1.  Run a new build manually from the Triggers page, or push a commit to trigger a build.
2.  Verify the application is working.

## 5. Clean up Git History (Optional but Recommended)
If the secret was committed to the repository, removing the file is not enough (it's still in the history).
1.  Use a tool like `BFG Repo-Cleaner` or `git filter-branch` to rewrite history (advanced).
2.  For now, ensuring it's removed from the *current* HEAD and ignored is the most important first step.
