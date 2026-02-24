# Email Configuration for NodeMailer
# Add these to your test.env file to enable email functionality

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mybikerssolution@gmail.com
SMTP_PASS=your-app-password

# Email Settings
FROM_EMAIL=mybikerssolution@gmail.com
FRONTEND_URL=http://localhost:5173

# Note: For Gmail, you need to:
# 1. Enable 2-factor authentication
# 2. Generate an App Password (not your regular password)
# 3. Use the App Password in SMTP_PASS

# For other email providers:
# - Outlook/Hotmail: smtp-mail.outlook.com:587
# - Yahoo: smtp.mail.yahoo.com:587
# - Custom SMTP: Use your provider's settings