const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', error);
          reject(new Error(`Failed to upload file: ${error.message}`));
        } else {
          logger.info('File uploaded to Cloudinary successfully', {
            publicId: result.public_id,
            url: result.secure_url,
            format: result.format,
            bytes: result.bytes
          });
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} Delete result
 */
const deleteFromCloudinary = (publicId, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, options, (error, result) => {
      if (error) {
        logger.error('Cloudinary delete error', error);
        reject(new Error(`Failed to delete file: ${error.message}`));
      } else {
        logger.info('File deleted from Cloudinary successfully', {
          publicId,
          result: result.result
        });
        resolve(result);
      }
    });
  });
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array<Object>>} Array of upload results
 */
const uploadMultipleToCloudinary = async (fileBuffers, options = {}) => {
  try {
    const uploadPromises = fileBuffers.map((buffer, index) => {
      const fileOptions = {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${index}` : undefined
      };
      return uploadToCloudinary(buffer, fileOptions);
    });

    const results = await Promise.allSettled(uploadPromises);
    
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          index,
          error: result.reason.message
        });
        logger.error(`Failed to upload file at index ${index}`, result.reason);
      }
    });

    return {
      successful,
      failed,
      totalUploaded: successful.length,
      totalFailed: failed.length
    };

  } catch (error) {
    logger.error('Multiple upload error', error);
    throw new Error('Failed to upload multiple files');
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} Delete results
 */
const deleteMultipleFromCloudinary = async (publicIds, options = {}) => {
  try {
    const deletePromises = publicIds.map(publicId => 
      deleteFromCloudinary(publicId, options)
    );

    const results = await Promise.allSettled(deletePromises);
    
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({
          publicId: publicIds[index],
          result: result.value
        });
      } else {
        failed.push({
          publicId: publicIds[index],
          error: result.reason.message
        });
        logger.error(`Failed to delete file ${publicIds[index]}`, result.reason);
      }
    });

    return {
      successful,
      failed,
      totalDeleted: successful.length,
      totalFailed: failed.length
    };

  } catch (error) {
    logger.error('Multiple delete error', error);
    throw new Error('Failed to delete multiple files');
  }
};

/**
 * Generate transformation URL for an image
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
const generateTransformationUrl = (publicId, transformations = {}) => {
  try {
    const url = cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
    
    logger.info('Generated transformation URL', {
      publicId,
      transformations,
      url
    });
    
    return url;
  } catch (error) {
    logger.error('Failed to generate transformation URL', error);
    throw new Error('Failed to generate transformation URL');
  }
};

/**
 * Get file information from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<Object>} File information
 */
const getFileInfo = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.api.resource(publicId, (error, result) => {
      if (error) {
        logger.error('Failed to get file info from Cloudinary', error);
        reject(new Error(`Failed to get file info: ${error.message}`));
      } else {
        logger.info('Retrieved file info from Cloudinary', {
          publicId,
          format: result.format,
          bytes: result.bytes,
          createdAt: result.created_at
        });
        resolve(result);
      }
    });
  });
};

/**
 * Search files in Cloudinary
 * @param {string} expression - Search expression
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
const searchFiles = (expression, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.search
      .expression(expression)
      .with_field('context')
      .with_field('tags')
      .max_results(options.maxResults || 30)
      .next_cursor(options.nextCursor)
      .execute((error, result) => {
        if (error) {
          logger.error('Cloudinary search error', error);
          reject(new Error(`Search failed: ${error.message}`));
        } else {
          logger.info('Cloudinary search completed', {
            expression,
            totalCount: result.total_count,
            resultCount: result.resources.length
          });
          resolve(result);
        }
      });
  });
};

/**
 * Create upload preset for specific use cases
 * @param {string} name - Preset name
 * @param {Object} settings - Preset settings
 * @returns {Promise<Object>} Preset creation result
 */
const createUploadPreset = (name, settings = {}) => {
  return new Promise((resolve, reject) => {
    const defaultSettings = {
      unsigned: false,
      folder: 'gule',
      resource_type: 'auto',
      allowed_formats: 'jpg,png,gif,pdf,doc,docx',
      ...settings
    };

    cloudinary.api.create_upload_preset({
      name,
      ...defaultSettings
    }, (error, result) => {
      if (error) {
        logger.error('Failed to create upload preset', error);
        reject(new Error(`Failed to create preset: ${error.message}`));
      } else {
        logger.info('Upload preset created successfully', {
          name,
          settings: defaultSettings
        });
        resolve(result);
      }
    });
  });
};

/**
 * Validate Cloudinary configuration
 * @returns {boolean} Configuration validity
 */
const validateCloudinaryConfig = () => {
  const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Missing Cloudinary configuration', {
      missingVariables: missingVars
    });
    return false;
  }

  logger.info('Cloudinary configuration validated successfully');
  return true;
};

/**
 * Get Cloudinary usage statistics
 * @returns {Promise<Object>} Usage statistics
 */
const getUsageStats = () => {
  return new Promise((resolve, reject) => {
    cloudinary.api.usage((error, result) => {
      if (error) {
        logger.error('Failed to get Cloudinary usage stats', error);
        reject(new Error(`Failed to get usage stats: ${error.message}`));
      } else {
        logger.info('Retrieved Cloudinary usage stats', {
          plan: result.plan,
          credits: result.credits,
          objects: result.objects,
          bandwidth: result.bandwidth,
          storage: result.storage
        });
        resolve(result);
      }
    });
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  deleteMultipleFromCloudinary,
  generateTransformationUrl,
  getFileInfo,
  searchFiles,
  createUploadPreset,
  validateCloudinaryConfig,
  getUsageStats,
  cloudinary
};