# AiFlow — Supabase Email Templates

Branded HTML templates for all Supabase transactional emails.

**Where to apply:** Supabase Dashboard → Authentication → Email Templates
**Prerequisite:** Custom SMTP must be configured first (Supabase Dashboard → Project Settings → Auth → SMTP Settings). Without custom SMTP, Supabase does not allow editing email templates.

**Variables used:**
- `{{ .ConfirmationURL }}` — the action URL (reset link, sign-in link, etc.)
- `{{ .Email }}` — the recipient's email address

**Brand colours:** background `#0d0d14` · card `#16161f` · border `#2a2a3d` · brand `#7c6af7` · text `#e8e8f0` · muted `#9090a8`

---

## 1 — Reset Password

**Subject:**
```
Reset your AiFlow password
```

**Body:**
```html
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161f;border:1px solid #2a2a3d;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px;">⬡ AiFlow</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#e8e8f0;">Reset your password</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 0;color:#9090a8;font-size:15px;line-height:1.6;">
          <p style="margin:0;">We received a request to reset the password for your AiFlow account. Click the button below to choose a new password.</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c6af7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Reset password</a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;color:#606074;font-size:13px;line-height:1.6;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
        </td></tr>
        <tr><td style="padding:32px 36px;border-top:1px solid #2a2a3d;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5a;">AiFlow · built by <a href="https://github.com/fuvito" style="color:#7c6af7;text-decoration:none;">Fuat Yazar</a> · <a href="https://github.com/fuvito/aiflow" style="color:#7c6af7;text-decoration:none;">GitHub</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```

---

## 2 — Magic Link / Sign In

**Subject:**
```
Your AiFlow sign-in link
```

**Body:**
```html
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161f;border:1px solid #2a2a3d;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px;">⬡ AiFlow</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#e8e8f0;">Sign in to AiFlow</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 0;color:#9090a8;font-size:15px;line-height:1.6;">
          <p style="margin:0;">Click the button below to sign in. This link expires in 10 minutes and can only be used once.</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c6af7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Sign in to AiFlow</a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;color:#606074;font-size:13px;line-height:1.6;">If you didn't request this link, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:32px 36px;border-top:1px solid #2a2a3d;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5a;">AiFlow · built by <a href="https://github.com/fuvito" style="color:#7c6af7;text-decoration:none;">Fuat Yazar</a> · <a href="https://github.com/fuvito/aiflow" style="color:#7c6af7;text-decoration:none;">GitHub</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```

---

## 3 — Confirm Signup

**Subject:**
```
Confirm your AiFlow account
```

**Body:**
```html
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161f;border:1px solid #2a2a3d;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px;">⬡ AiFlow</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#e8e8f0;">Confirm your email</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 0;color:#9090a8;font-size:15px;line-height:1.6;">
          <p style="margin:0;">Thanks for signing up for AiFlow. Click the button below to confirm your email address and activate your account.</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c6af7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Confirm email</a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;color:#606074;font-size:13px;line-height:1.6;">If you didn't create an AiFlow account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:32px 36px;border-top:1px solid #2a2a3d;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5a;">AiFlow · built by <a href="https://github.com/fuvito" style="color:#7c6af7;text-decoration:none;">Fuat Yazar</a> · <a href="https://github.com/fuvito/aiflow" style="color:#7c6af7;text-decoration:none;">GitHub</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```

---

## 4 — Change Email Address

**Subject:**
```
Confirm your new AiFlow email address
```

**Body:**
```html
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161f;border:1px solid #2a2a3d;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px;">⬡ AiFlow</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#e8e8f0;">Confirm your new email</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 0;color:#9090a8;font-size:15px;line-height:1.6;">
          <p style="margin:0;">You requested to change the email address on your AiFlow account. Click the button below to confirm your new address.</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c6af7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Confirm new email</a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;color:#606074;font-size:13px;line-height:1.6;">If you didn't request this change, please contact us immediately — your account may be at risk.</p>
        </td></tr>
        <tr><td style="padding:32px 36px;border-top:1px solid #2a2a3d;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5a;">AiFlow · built by <a href="https://github.com/fuvito" style="color:#7c6af7;text-decoration:none;">Fuat Yazar</a> · <a href="https://github.com/fuvito/aiflow" style="color:#7c6af7;text-decoration:none;">GitHub</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```

---

## 5 — Invite User

**Subject:**
```
You've been invited to AiFlow
```

**Body:**
```html
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161f;border:1px solid #2a2a3d;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px;">⬡ AiFlow</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#e8e8f0;">You're in.</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 0;color:#9090a8;font-size:15px;line-height:1.6;">
          <p style="margin:0;">You've been granted access to AiFlow — a visual designer for AI agent workflows. Click the button below to set up your account and get started.</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c6af7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Set up my account</a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;color:#606074;font-size:13px;line-height:1.6;">This invitation link expires in 24 hours. If you weren't expecting this, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:32px 36px;border-top:1px solid #2a2a3d;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5a;">AiFlow · built by <a href="https://github.com/fuvito" style="color:#7c6af7;text-decoration:none;">Fuat Yazar</a> · <a href="https://github.com/fuvito/aiflow" style="color:#7c6af7;text-decoration:none;">GitHub</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```
