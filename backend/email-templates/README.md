# Hilgod-branded Supabase Auth email templates

Paste each file's HTML into **Supabase Dashboard → Authentication → Emails → Templates**,
into the matching template's **Message body**. Keep the `{{ ... }}` variables exactly as-is.

| File | Supabase template | Variables used | Suggested subject |
|------|-------------------|----------------|-------------------|
| `supabase-confirm-signup.html` | Confirm signup | `{{ .ConfirmationURL }}` | Confirm your Hilgod account |
| `supabase-invite-user.html` | Invite user | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` | You're invited to Hilgod |
| `supabase-magic-link.html` | Magic Link | `{{ .ConfirmationURL }}` | Your Hilgod sign-in link |
| `supabase-change-email.html` | Change Email Address | `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .ConfirmationURL }}` | Confirm your new email |
| `supabase-reset-password.html` | Reset Password | `{{ .ConfirmationURL }}` | Reset your Hilgod password |
| `supabase-reauthentication.html` | Reauthentication | `{{ .Token }}` | Your Hilgod verification code |

All share the same brand: red `#E31C1C`, the email logo from `https://www.hilgod.com/email-logo.png`,
a red CTA button, and a support footer — matching the transactional emails in `src/services/email.js`.

Note: ensure `https://www.hilgod.com/email-logo.png` is deployed and publicly reachable so the
logo renders in inboxes.
