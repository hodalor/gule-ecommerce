const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email utility class for sending various types of emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', error);
    }
  }

  /**
   * Send verification email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} verificationToken - Verification token
   * @param {string} userType - User type (user, seller, admin)
   */
  async sendVerificationEmail(email, name, verificationToken, userType = 'user') {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&type=${userType}`;
      
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Gule Marketplace'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to ${process.env.APP_NAME || 'Gule Marketplace'}!</h2>
            <p>Hello ${name},</p>
            <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              If you didn't create an account with us, please ignore this email.
            </p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent successfully', { email, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send verification email', { email, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} resetToken - Password reset token
   * @param {string} userType - User type (user, seller, admin)
   */
  async sendPasswordResetEmail(email, name, resetToken, userType = 'user') {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&type=${userType}`;
      
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Gule Marketplace'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>This password reset link will expire in 1 hour.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent successfully', { email, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send password reset email', { email, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} userType - User type (user, seller, admin)
   */
  async sendWelcomeEmail(email, name, userType = 'user') {
    try {
      const dashboardUrl = userType === 'seller' 
        ? `${process.env.SELLER_DASHBOARD_URL || process.env.FRONTEND_URL}/seller/dashboard`
        : userType === 'admin'
        ? `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin`
        : `${process.env.FRONTEND_URL}/dashboard`;

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Gule Marketplace'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Welcome to ${process.env.APP_NAME || 'Gule Marketplace'}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to ${process.env.APP_NAME || 'Gule Marketplace'}!</h2>
            <p>Hello ${name},</p>
            <p>Your account has been successfully verified and activated. Welcome to our marketplace!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p>You can now:</p>
            <ul>
              ${userType === 'seller' ? `
                <li>List your products</li>
                <li>Manage your inventory</li>
                <li>Track your sales</li>
                <li>Communicate with customers</li>
              ` : userType === 'admin' ? `
                <li>Manage users and sellers</li>
                <li>Monitor platform activity</li>
                <li>Handle disputes</li>
                <li>Configure system settings</li>
              ` : `
                <li>Browse and purchase products</li>
                <li>Track your orders</li>
                <li>Leave reviews</li>
                <li>Manage your profile</li>
              `}
            </ul>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              If you have any questions, feel free to contact our support team.
            </p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent successfully', { email, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send welcome email', { email, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order notification email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {Object} orderData - Order information
   */
  async sendOrderNotification(email, name, orderData) {
    try {
      const { orderId, status, items, total } = orderData;
      
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Gule Marketplace'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order ${status} - #${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Order ${status}</h2>
            <p>Hello ${name},</p>
            <p>Your order #${orderId} has been ${status.toLowerCase()}.</p>
            <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Status:</strong> ${status}</p>
              <p><strong>Total:</strong> $${total}</p>
              <h4>Items:</h4>
              <ul>
                ${items.map(item => `<li>${item.name} - Quantity: ${item.quantity} - $${item.price}</li>`).join('')}
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${orderId}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Order notification email sent successfully', { email, orderId, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send order notification email', { email, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      await this.transporter.verify();
      logger.info('Email service connection test successful');
      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      logger.error('Email service connection test failed', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService();

module.exports = {
  emailService,
  sendVerificationEmail: (email, name, token, userType) => emailService.sendVerificationEmail(email, name, token, userType),
  sendPasswordResetEmail: (email, name, token, userType) => emailService.sendPasswordResetEmail(email, name, token, userType),
  sendWelcomeEmail: (email, name, userType) => emailService.sendWelcomeEmail(email, name, userType),
  sendOrderNotification: (email, name, orderData) => emailService.sendOrderNotification(email, name, orderData),
  testEmailConnection: () => emailService.testConnection()
};