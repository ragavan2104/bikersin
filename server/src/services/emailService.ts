import nodemailer from 'nodemailer';
import { config } from '../config/env';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  if (!config.SMTP_USER || !config.SMTP_PASS) {
    console.warn('⚠️  Email configuration incomplete. SMTP_USER and SMTP_PASS are required.');
    return null;
  }

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
};

export const sendPasswordResetEmail = async (
  email: string, 
  resetToken: string,
  userName?: string
) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('Email service not configured properly');
  }

  const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"BikersIn Support" <${config.FROM_EMAIL}>`,
    to: email,
    subject: 'Password Reset Request - BikersIn',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f8fafc; padding: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
          .warning { background: #fef3cd; border: 1px solid #facc15; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ BikersIn</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName || 'there'}!</h2>
            
            <p>We received a request to reset your password for your BikersIn account associated with <strong>${email}</strong>.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 3px;">${resetUrl}</p>
            
            <div class="warning">
              <p><strong>⚠️ Important Security Information:</strong></p>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
            
            <p>Best regards,<br>The BikersIn Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} BikersIn. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - BikersIn
      
      Hello ${userName || 'there'}!
      
      We received a request to reset your password for your BikersIn account (${email}).
      
      To reset your password, visit this link: ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this reset, please ignore this email.
      
      Best regards,
      The BikersIn Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendWelcomeEmail = async (
  email: string,
  userName: string,
  tempPassword?: string
) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('Email service not configured properly');
  }

  const loginUrl = `${config.FRONTEND_URL}/login`;
  
  const mailOptions = {
    from: `"BikersIn Team" <${config.FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to BikersIn - Your Account is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to BikersIn</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
          .content { background: #f8fafc; padding: 30px; }
          .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .credentials { background: #fef3cd; border: 1px solid #facc15; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ Welcome to BikersIn!</h1>
            <p>Your account is ready to go</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>Welcome to BikersIn! Your account has been successfully created and you're ready to start managing your bike business.</p>
            
            ${tempPassword ? `
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
                <p><em>Please change your password after your first login for security.</em></p>
              </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to BikersIn</a>
            </div>
            
            <p>What you can do with BikersIn:</p>
            <ul>
              <li>📊 Manage your bike inventory</li>
              <li>💰 Track sales and revenue</li>
              <li>👥 Manage customer relationships</li>
              <li>📈 View detailed analytics</li>
              <li>🔧 Handle maintenance schedules</li>
            </ul>
            
            <p>If you have any questions or need help getting started, please don't hesitate to reach out to our support team.</p>
            
            <p>Happy selling!<br>The BikersIn Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} BikersIn. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to BikersIn!
      
      Hello ${userName}!
      
      Your BikersIn account has been successfully created.
      
      ${tempPassword ? `
      Login Credentials:
      Email: ${email}
      Temporary Password: ${tempPassword}
      
      Please change your password after your first login.
      ` : ''}
      
      Login at: ${loginUrl}
      
      Best regards,
      The BikersIn Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};