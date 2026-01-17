# Supabase OTP Setup for Signup & Password Reset

Your code is already configured to use **OTP (One-Time Password)** based authentication for both signup and password reset flows. Follow these steps in your Supabase Dashboard to ensure OTP codes are sent instead of magic links.

---

## ✅ What's Already Done in Your Code

Your [src/pages/Auth.tsx](src/pages/Auth.tsx) already has OTP configured:
- **Signup**: Uses `supabase.auth.resend()` with type `'signup'` → sends OTP
- **Password Reset**: Uses `supabase.auth.signInWithOtp()` → sends OTP
- **Verification**: Uses `verifyOtp()` to validate 6-digit codes
- **Messages**: Updated to say "Check your email for verification code"

---

## 🔧 Supabase Dashboard Configuration

Follow these steps in your [Supabase Dashboard](https://app.supabase.com):

### 1. **Go to Authentication Settings**
   - Select your project
   - Click **Authentication** (left sidebar)
   - Click **Providers** tab
   - Select **Email**

### 2. **Enable Email OTP (Critical!)**
   Look for these options and ensure they're configured:

   - **✅ Enable Email OTP**: Toggle **ON**
   - **Require email verification**: Toggle **ON** (recommended)
   - **Disable Signup (Disallow)**: Keep **OFF** (you want users to sign up)

### 3. **Email Templates Configuration**
   Make sure Supabase is configured to send OTP codes (not magic links):

   **For Signup Verification:**
   - Template: "Signup verification"
   - Should contain: `{{ .ConfirmationURL }}` or `{{ .Token }}` depending on your template
   - Recommended: Use OTP token-based template if available

   **For Password Reset:**
   - Template: "Recovery email"  
   - Should contain: `{{ .Token }}` for OTP code
   - Recommended: Use OTP token-based template

   **Check your Email Templates:**
   - Go to **Authentication** → **Email Templates**
   - For "Signup" and "Recovery" templates, ensure they send token-based verification
   - If templates contain `{{ .ConfirmationURL }}`, they'll send magic links (magic links also work, but OTP is more secure)

### 4. **Alternative: Use Magic Links (If Preferred)**
   If you want to accept both OTP codes AND magic links (Supabase can send both):
   - Your current code handles both: `verifyOtp()` tries 'signup' type first, then 'email' type
   - The UI will accept the 6-digit code OR allow users to click a magic link from email

---

## 📱 What Users Will Experience

### Signup Flow:
1. User enters email and password
2. Clicks "Sign Up"
3. **Toast message**: "Verification code sent! Check your email at user@email.com for your 6-digit verification code. If you don't see it, check your spam folder."
4. User receives email with 6-digit OTP code
5. User enters 6 digits in the verification screen
6. Account created and user signed in

### Password Reset Flow:
1. User clicks "Forgot password?"
2. Enters email
3. **Toast message**: "Code sent! Please check your email for the 6-digit password reset code."
4. User receives email with 6-digit OTP code
5. User enters 6 digits
6. Sets new password
7. Returns to signin

---

## 🔑 Key Code Points

### Signup OTP Request ([Auth.tsx](src/pages/Auth.tsx#L273-L283))
```typescript
const { error: otpError } = await supabase.auth.resend({
  type: 'signup',
  email: email.trim(),
});
```

### OTP Verification ([Auth.tsx](src/pages/Auth.tsx#L432-L457))
```typescript
const result = await supabase.auth.verifyOtp({
  email: otpEmail,
  token: otpCode,
  type: 'signup',
});
```

### Password Reset OTP ([Auth.tsx](src/pages/Auth.tsx#L726-L735))
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: email.trim(),
  options: {
    shouldCreateUser: false,
  },
});
```

---

## ✨ Optional Customizations

### 1. Add CAPTCHA to Signup
If needed, uncomment reCAPTCHA validation in your signup code.

### 2. Customize Email Template
In Supabase Email Templates, customize the message sent to users:
```
Subject: Your SimplifiedHost Verification Code

Hi [User],

Your SimplifiedHost verification code is: {{ .Token }}

This code expires in 15 minutes.

[SimplifiedHost Team]
```

### 3. Adjust OTP Cooldown
In [Auth.tsx](src/pages/Auth.tsx#L289), change this value:
```typescript
setResendOtpCooldown(60); // 60 seconds between resends
```

### 4. OTP Validity Duration
In Supabase, OTP codes are valid for **15 minutes** by default (this is set at the Supabase project level, not in your code).

---

## 🆘 Troubleshooting

### "Not getting OTP emails?"
1. Check Supabase Email Templates are configured
2. Verify email provider is set up (Supabase default or custom SMTP)
3. Check user's spam/junk folder
4. Check Supabase logs: **Logs** → **Auth logs** → Look for email delivery failures

### "Getting magic links instead of OTP?"
1. Your email template might have `{{ .ConfirmationURL }}` instead of `{{ .Token }}`
2. Go to Authentication → Email Templates → Edit the template
3. Ensure it uses `{{ .Token }}` not `{{ .ConfirmationURL }}`

### "OTP code not working?"
1. Make sure user enters exactly 6 digits
2. Code expires after 15 minutes - user needs to resend
3. Check browser console for specific error messages
4. Verify in Supabase logs under **Auth logs**

---

## 📋 Checklist

Before going live:

- [ ] Email OTP is enabled in Supabase Auth settings
- [ ] Email templates are configured to send OTP tokens (not magic links)
- [ ] Test signup flow end-to-end with real email
- [ ] Test password reset flow with real email
- [ ] Verify toast messages display correctly
- [ ] Check spam folder handling is clear in UX
- [ ] OTP cooldown timer (60s) is appropriate for your UX
- [ ] Resend functionality works and respects cooldown

---

## 🚀 Going Live

Your OTP flow is production-ready! The code:
- ✅ Validates OTP format (6 digits)
- ✅ Handles expired codes gracefully
- ✅ Prevents resend spam with cooldown timer
- ✅ Stores user consents on signup
- ✅ Has proper error handling and user feedback

Just ensure Supabase Email OTP is enabled and email templates are set up correctly!
