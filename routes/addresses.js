const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const { authenticate } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const validateAddress = [
  body('type').isIn(['home', 'office', 'billing', 'shipping', 'other']).withMessage('Invalid address type'),
  body('recipient.firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required and must be less than 50 characters'),
  body('recipient.lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required and must be less than 50 characters'),
  body('recipient.phone').trim().isLength({ min: 1 }).withMessage('Phone number is required'),
  body('address.street1').trim().isLength({ min: 1, max: 100 }).withMessage('Street address is required and must be less than 100 characters'),
  body('address.city').trim().isLength({ min: 1, max: 50 }).withMessage('City is required and must be less than 50 characters'),
  body('address.state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required and must be less than 50 characters'),
  body('address.postalCode').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required and must be less than 20 characters'),
  body('address.country').trim().isLength({ min: 1, max: 50 }).withMessage('Country is required and must be less than 50 characters')
];

const validateAddressId = [
  param('id').isMongoId().withMessage('Invalid address ID')
];

// Helper function to handle validation errors
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

// @route   GET /api/addresses
// @desc    Get all addresses for authenticated user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, isDefault, isActive = true } = req.query;
    
    const filter = { 
      userId: req.user.id,
      isActive: isActive === 'true'
    };
    
    if (type) filter.type = type;
    if (isDefault !== undefined) filter.isDefault = isDefault === 'true';

    const addresses = await Address.find(filter)
      .sort({ isDefault: -1, createdAt: -1 })
      .populate('userId', 'firstName lastName email');

    res.json({
      success: true,
      count: addresses.length,
      data: addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching addresses'
    });
  }
});

// @route   GET /api/addresses/:id
// @desc    Get single address by ID
// @access  Private
router.get('/:id', authenticate, validateAddressId, handleValidationErrors, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    }).populate('userId', 'firstName lastName email');

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching address'
    });
  }
});

// @route   POST /api/addresses
// @desc    Create new address
// @access  Private
router.post('/', authenticate, validateAddress, handleValidationErrors, async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      userId: req.user.id
    };

    // If this is set as default, unset other default addresses of the same type
    if (addressData.isDefault) {
      await Address.updateMany(
        { 
          userId: req.user.id, 
          type: addressData.type,
          isActive: true
        },
        { $set: { isDefault: false } }
      );
    }

    const address = new Address(addressData);
    await address.save();

    await address.populate('userId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    console.error('Error creating address:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Address ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating address'
    });
  }
});

// @route   PUT /api/addresses/:id
// @desc    Update address
// @access  Private
router.put('/:id', authenticate, validateAddressId, validateAddress, handleValidationErrors, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other default addresses of the same type
    if (req.body.isDefault && !address.isDefault) {
      await Address.updateMany(
        { 
          userId: req.user.id, 
          type: req.body.type || address.type,
          _id: { $ne: req.params.id },
          isActive: true
        },
        { $set: { isDefault: false } }
      );
    }

    // Update address fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'userId' && key !== 'addressId') {
        address[key] = req.body[key];
      }
    });

    await address.save();
    await address.populate('userId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating address'
    });
  }
});

// @route   PATCH /api/addresses/:id/default
// @desc    Set address as default
// @access  Private
router.patch('/:id/default', authenticate, validateAddressId, handleValidationErrors, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset other default addresses of the same type
    await Address.updateMany(
      { 
        userId: req.user.id, 
        type: address.type,
        _id: { $ne: req.params.id },
        isActive: true
      },
      { $set: { isDefault: false } }
    );

    // Set this address as default
    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: 'Address set as default successfully',
      data: address
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting default address'
    });
  }
});

// @route   DELETE /api/addresses/:id
// @desc    Soft delete address (mark as inactive)
// @access  Private
router.delete('/:id', authenticate, validateAddressId, handleValidationErrors, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Soft delete by marking as inactive
    address.isActive = false;
    address.isDefault = false;
    await address.save();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting address'
    });
  }
});

// @route   POST /api/addresses/:id/validate
// @desc    Validate address (could integrate with address validation service)
// @access  Private
router.post('/:id/validate', authenticate, validateAddressId, handleValidationErrors, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Mark address as validated
    address.validation.isValidated = true;
    address.validation.validatedAt = new Date();
    address.validation.validationService = 'internal';
    
    await address.save();

    res.json({
      success: true,
      message: 'Address validated successfully',
      data: {
        isValid: true,
        validatedAt: address.validation.validatedAt
      }
    });
  } catch (error) {
    console.error('Error validating address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating address'
    });
  }
});

// @route   GET /api/addresses/stats
// @desc    Get address statistics for user
// @access  Private
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const stats = await Address.aggregate([
      { $match: { userId: req.user.id, isActive: true } },
      {
        $group: {
          _id: null,
          totalAddresses: { $sum: 1 },
          addressesByType: {
            $push: {
              type: '$type',
              isDefault: '$isDefault'
            }
          }
        }
      }
    ]);

    const typeStats = {};
    let defaultCount = 0;

    if (stats.length > 0) {
      stats[0].addressesByType.forEach(addr => {
        typeStats[addr.type] = (typeStats[addr.type] || 0) + 1;
        if (addr.isDefault) defaultCount++;
      });
    }

    res.json({
      success: true,
      data: {
        totalAddresses: stats.length > 0 ? stats[0].totalAddresses : 0,
        defaultAddresses: defaultCount,
        addressesByType: typeStats
      }
    });
  } catch (error) {
    console.error('Error fetching address stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching address statistics'
    });
  }
});

module.exports = router;