-- Email confirmation template
UPDATE auth.config SET
confirmation_email_subject = 'Welcome to FreelanceFlow - Please confirm your email',
confirmation_email_body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">FreelanceFlow</h1>
  </div>
  <div style="padding: 30px; background-color: #f9fafb;">
    <h2 style="color: #374151;">Welcome to FreelanceFlow!</h2>
    <p style="color: #6b7280; font-size: 16px;">
      Thank you for signing up. Please click the button below to confirm your email address and activate your account.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Confirm Email Address
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 14px;">
      If you did not create an account, please ignore this email.
    </p>
  </div>
</div>
';

-- Password reset template
UPDATE auth.config SET
recovery_email_subject = 'Reset your FreelanceFlow password',
recovery_email_body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">FreelanceFlow</h1>
  </div>
  <div style="padding: 30px; background-color: #f9fafb;">
    <h2 style="color: #374151;">Reset Your Password</h2>
    <p style="color: #6b7280; font-size: 16px;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Reset Password
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 14px;">
      If you did not request this password reset, please ignore this email. This link will expire in 24 hours.
    </p>
  </div>
</div>
';