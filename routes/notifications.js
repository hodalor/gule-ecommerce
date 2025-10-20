const express = require('express');
const router = express.Router();
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

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

module.exports = router;