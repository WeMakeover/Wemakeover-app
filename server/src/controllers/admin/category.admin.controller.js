import Category from '../../models/category.model.js';
import Service from '../../models/service.model.js';
import UploadFactory from '../../services/upload/uploadFactory.js';
import { validateFile, getFileFromRequest } from '../../utils/fileValidation.utils.js';
import { parseBoolField } from '../../utils/bool.utils.js';
import { isValidId } from '../../utils/id.utils.js';

const uploadOptionalMobileImage = async (req, folder) => {
  const file = getFileFromRequest(req, 'mobileImage');
  if (!file) return null;

  const validation = validateFile(file);
  if (!validation.valid) {
    const err = new Error('Mobile image validation failed');
    err.statusCode = 400;
    err.errors = validation.errors;
    throw err;
  }

  const uploader = UploadFactory.getProvider();
  return uploader.upload(file, folder);
};

const clearStoredMobileImage = async (record, uploader) => {
  if (!record?.mobileImagePublicId) return;
  try {
    await uploader.delete(record.mobileImagePublicId);
  } catch (deleteError) {
    console.warn('⚠️ Failed to delete mobile image:', deleteError);
  }
  record.mobileImage = null;
  record.mobileImagePublicId = null;
};

/**
 * @route   POST /api/admin/categories
 * @desc    Create a new category with image upload
 * @access  Admin only
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, displayOrder } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const uploader = UploadFactory.getProvider();
    let imageUrl = null;
    let imagePublicId = null;
    let mobileImage = null;
    let mobileImagePublicId = null;

    const file = getFileFromRequest(req, 'image');
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Image validation failed',
          errors: validation.errors
        });
      }
      const uploadResult = await uploader.upload(file, 'categories');
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.publicId;
    }

    try {
      const mobileUpload = await uploadOptionalMobileImage(req, 'categories/mobile');
      if (mobileUpload) {
        mobileImage = mobileUpload.url;
        mobileImagePublicId = mobileUpload.publicId;
        if (!imageUrl) {
          imageUrl = mobileUpload.url;
          imagePublicId = mobileUpload.publicId;
        }
      }
    } catch (mobileErr) {
      if (mobileErr.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: mobileErr.message,
          errors: mobileErr.errors,
        });
      }
      throw mobileErr;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Category banner image is required'
      });
    }

    // Generate slug from name (as fallback, pre-save hook should also do this)
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    // Create category
    const category = new Category({
      name,
      slug: generateSlug(name), // Explicitly set slug to ensure it exists
      description: description || '',
      image: imageUrl,
      imagePublicId,
      mobileImage,
      mobileImagePublicId,
      displayOrder: Number.parseInt(displayOrder, 10) || 0,
      createdBy: req.user?.id || req.user?._id || null,
      metadata: {
        totalServices: 0,
        activeServices: 0
      }
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        mobileImage: category.mobileImage || null,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories with optional filters
 * @access  Admin only
 */
export const getAllCategories = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      isActive, 
      search,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch categories
    const categories = await Category.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get service count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const serviceCount = await Service.countDocuments({ 
          categoryId: category._id 
        });
        const activeServiceCount = await Service.countDocuments({ 
          categoryId: category._id,
          isActive: true 
        });

        return {
          ...category,
          serviceCount,
          activeServiceCount
        };
      })
    );

    // Get total count
    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: categoriesWithCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCategories,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get single category details
 * @access  Admin only
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = await Category.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get services in this category
    const services = await Service.find({ categoryId: id })
      .select('name price duration isActive isAvailable')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Category details retrieved successfully',
      data: {
        ...category,
        services,
        serviceCount: services.length,
        activeServiceCount: services.filter(s => s.isActive).length
      }
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update category (with optional image update)
 * @access  Admin only
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, displayOrder, isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if name is being changed and if it conflicts with another category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      category.name = name;
    }

    // Update other fields (FormData sends strings — coerce for Prisma)
    if (description !== undefined) category.description = description;
    if (displayOrder !== undefined && displayOrder !== '') {
      const order = Number.parseInt(displayOrder, 10);
      if (Number.isNaN(order)) {
        return res.status(400).json({
          success: false,
          message: 'Display order must be a number',
        });
      }
      category.displayOrder = order;
    }
    if (isActive !== undefined) category.isActive = parseBoolField(isActive, category.isActive);

    const uploader = UploadFactory.getProvider();
    const previousImagePublicId = category.imagePublicId;
    const previousMobilePublicId = category.mobileImagePublicId;
    let replacedWebsiteImage = false;
    let replacedMobileImage = false;
    let removedMobileOnly = false;

    // Handle website image update when explicitly uploaded
    const file = getFileFromRequest(req, 'image');
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Image validation failed',
          errors: validation.errors
        });
      }

      const uploadResult = await uploader.upload(file, 'categories');
      category.image = uploadResult.url;
      category.imagePublicId = uploadResult.publicId;
      replacedWebsiteImage = true;
    }

    const removeMobileImage =
      req.body.removeMobileImage === 'true' || req.body.removeMobileImage === true;
    const mobileFile = getFileFromRequest(req, 'mobileImage');

    if (removeMobileImage && !mobileFile) {
      category.mobileImage = null;
      category.mobileImagePublicId = null;
      removedMobileOnly = true;
    } else if (mobileFile) {
      const validation = validateFile(mobileFile);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Mobile image validation failed',
          errors: validation.errors,
        });
      }

      const mobileUpload = await uploader.upload(mobileFile, 'categories/mobile');
      category.mobileImage = mobileUpload.url;
      category.mobileImagePublicId = mobileUpload.publicId;
      category.image = mobileUpload.url;
      category.imagePublicId = mobileUpload.publicId;
      replacedMobileImage = true;
    }

    category.updatedBy = req.user?.id || req.user?._id || null;
    await category.save();

    // Delete old Cloudinary assets only after DB save succeeds
    const deleteOld = async (publicId) => {
      if (!publicId) return;
      try {
        await uploader.delete(publicId);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old image:', deleteError);
      }
    };

    if (replacedWebsiteImage && previousImagePublicId && previousImagePublicId !== category.imagePublicId) {
      await deleteOld(previousImagePublicId);
    }
    if (replacedMobileImage) {
      if (previousMobilePublicId && previousMobilePublicId !== category.mobileImagePublicId) {
        await deleteOld(previousMobilePublicId);
      }
      if (
        previousImagePublicId &&
        previousImagePublicId !== category.imagePublicId &&
        previousImagePublicId !== previousMobilePublicId
      ) {
        await deleteOld(previousImagePublicId);
      }
    }
    if (removedMobileOnly && previousMobilePublicId) {
      await deleteOld(previousMobilePublicId);
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        mobileImage: category.mobileImage || null,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        updatedAt: category.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete category (only if no services exist)
 * @access  Admin only
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has services
    const serviceCount = await Service.countDocuments({ categoryId: id });
    if (serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${serviceCount} service(s). Please delete or reassign services first.`
      });
    }

    // Delete images from cloud storage
    if (category.imagePublicId || category.mobileImagePublicId) {
      try {
        const uploader = UploadFactory.getProvider();
        if (category.imagePublicId) {
          await uploader.delete(category.imagePublicId);
        }
        if (category.mobileImagePublicId) {
          await uploader.delete(category.mobileImagePublicId);
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete category image:', deleteError);
        // Continue even if image delete fails
      }
    }

    // Delete category
    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: {
        id: category._id,
        name: category.name
      }
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/categories/:id/services
 * @desc    Get all services in a category
 * @access  Admin only
 */
export const getCategoryServices = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, isActive } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Build query
    const query = { categoryId: id };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch services
    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalServices = await Service.countDocuments(query);
    const totalPages = Math.ceil(totalServices / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Category services retrieved successfully',
      data: {
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug
        },
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalServices,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching category services:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category services',
      error: error.message
    });
  }
};

/**
 * @route   PATCH /api/admin/categories/:id/toggle-active
 * @desc    Toggle category active status
 * @access  Admin only
 */
export const toggleCategoryActive = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.isActive = !category.isActive;
    category.updatedBy = req.user.id;
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: category._id,
        name: category.name,
        isActive: category.isActive,
        updatedAt: category.updatedAt
      }
    });

  } catch (error) {
    console.error('Error toggling category status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle category status',
      error: error.message
    });
  }
};
