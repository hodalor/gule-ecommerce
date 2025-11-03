const express = require('express');
const router = express.Router();
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
// Add email service imports
const { emailService, testEmailConnection } = require('../utils/email');

// Mock notification data for now - in a real app, this would come from a database
let notifications = [];

// Validation middleware
const validateNotification = [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'success', 'warning', 'error']).withMessage('Invalid notification type')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/notifications/:userId - Get notifications for a user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real app, filter notifications by userId from database
    const userNotifications = notifications.filter(n => n.userId === userId || n.userId === 'all');
    
    logger.info(`Fetched ${userNotifications.length} notifications for user ${userId}`);
    
    res.json({
      success: true,
      notifications: userNotifications
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// PATCH /api/notifications/:notificationId/read - Mark notification as read
router.patch('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Find and update notification
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    
    logger.info(`Marked notification ${notificationId} as read`);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// PATCH /api/notifications/:userId/read-all - Mark all notifications as read for a user
router.patch('/:userId/read-all', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mark all user notifications as read
    notifications.forEach(notification => {
      if (notification.userId === userId || notification.userId === 'all') {
        notification.read = true;
        notification.readAt = new Date();
      }
    });
    
    logger.info(`Marked all notifications as read for user ${userId}`);
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// DELETE /api/notifications/:notificationId - Delete a notification
router.delete('/:notificationId', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    notifications.splice(notificationIndex, 1);
    
    logger.info(`Deleted notification ${notificationId}`);
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// DELETE /api/notifications/:userId/clear-all - Clear all notifications for a user
router.delete('/:userId/clear-all', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Remove all notifications for the user
    notifications = notifications.filter(n => n.userId !== userId && n.userId !== 'all');
    
    logger.info(`Cleared all notifications for user ${userId}`);
    
    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    logger.error('Error clearing all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all notifications'
    });
  }
});

// POST /api/notifications - Create a new notification (admin only)
router.post('/', authenticate, authorizeUserType('admin'), validateNotification, handleValidationErrors, async (req, res) => {
  try {
    const { title, message, type = 'info', userId = 'all' } = req.body;
    
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      userId,
      read: false,
      createdAt: new Date(),
      readAt: null
    };
    
    notifications.push(notification);
    
    logger.info(`Created notification: ${title} for user ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
});

// POST /api/notifications/test-email - Send a test email (admin only)
router.post('/test-email',
  authenticate,
  authorizeUserType('admin'),
  [
    body('to').isEmail().withMessage('Recipient email is required and must be valid'),
    body('subject').optional().isLength({ min: 1, max: 200 }).withMessage('Subject must be 1-200 characters'),
    body('message').optional().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { to, subject = 'SMTP Test Email', message = 'This is a test email from Gule backend.' } = req.body;

      const verifyRes = await testEmailConnection();
      if (!verifyRes.success) {
        return res.status(400).json({ success: false, error: 'SMTP verification failed', details: verifyRes.error });
      }

      const from = `${process.env.APP_NAME || 'Gule Marketplace'} <${process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER}>`;

      const result = await emailService.transporter.sendMail({
        from,
        to,
        subject,
        text: message,
        html: `<p>${message}</p>`
      });

      logger.info('Test email sent via API', { to, messageId: result.messageId, adminId: req.user.id });
      return res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      logger.error('Failed to send test email via API', { error: error.message, adminId: req.user.id });
      return res.status(500).json({ success: false, error: 'Failed to send test email', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  }
);

module.exports = router;