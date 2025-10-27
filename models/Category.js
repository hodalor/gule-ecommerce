const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated category ID
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         parentCategory:
 *           type: string
 *           description: Parent category ID for subcategories
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 *         order:
 *           type: number
 *           description: Display order
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  order: {
    type: Number,
    default: 0
  },
  image: {
    url: {
      type: String
    },
    alt: {
      type: String,
      trim: true
    }
  },
  metadata: {
    productCount: {
      type: Number,
      default: 0
    },
    subcategoryCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Virtual for products
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category'
});

// Index for better performance
categorySchema.index({ name: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ order: 1 });

// Static method to get category hierarchy
categorySchema.statics.getHierarchy = async function() {
  const categories = await this.find({ status: 'active' }).sort({ order: 1, name: 1 });
  
  const buildHierarchy = (parentId = null) => {
    return categories
      .filter(cat => {
        if (parentId === null) {
          return !cat.parentCategory;
        }
        return cat.parentCategory && cat.parentCategory.toString() === parentId.toString();
      })
      .map(cat => ({
        ...cat.toObject(),
        children: buildHierarchy(cat._id)
      }));
  };
  
  return buildHierarchy();
};

// Static method to get all category paths
categorySchema.statics.getCategoryPaths = async function() {
  const categories = await this.find({ status: 'active' }).populate('parentCategory');
  
  const paths = {};
  
  categories.forEach(cat => {
    const path = [];
    let current = cat;
    
    while (current) {
      path.unshift(current.name);
      current = current.parentCategory;
    }
    
    paths[cat._id] = path.join(' > ');
  });
  
  return paths;
};

module.exports = mongoose.model('Category', categorySchema);