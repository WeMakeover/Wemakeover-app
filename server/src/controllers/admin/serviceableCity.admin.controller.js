import ServiceableCity from '../../models/serviceableCity.model.js';
import { invalidateCityCache } from '../../utils/cityValidator.js';

/**
 * ServiceableCity Admin Controller
 * 
 * CRUD operations for managing serviceable cities (Admin only)
 */

/**
 * @route   GET /api/admin/serviceable-cities
 * @desc    Get all serviceable cities with filters
 * @access  Private (Admin only)
 */
export const getAllServiceableCities = async (req, res) => {
  try {
    const { status, sort = '-priority', page = 1, limit = 50 } = req.query;
    
    console.log('📍 [Admin - Get All Cities] Fetching serviceable cities');
    
    // Build query
    const query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cities = await ServiceableCity.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count
    const total = await ServiceableCity.countDocuments(query);
    
    console.log(`✅ [Admin - Get All Cities] Found ${cities.length} cities`);
    
    res.status(200).json({
      success: true,
      data: cities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ [Admin - Get All Cities] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch serviceable cities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   GET /api/admin/serviceable-cities/stats
 * @desc    Get statistics about serviceable cities
 * @access  Private (Admin only)
 */
export const getServiceableCityStats = async (req, res) => {
  try {
    console.log('📊 [Admin - City Stats] Generating statistics');
    
    const [
      totalCities,
      activeCities,
      inactiveCities,
      totalBookings,
      topCities
    ] = await Promise.all([
      ServiceableCity.countDocuments(),
      ServiceableCity.countDocuments({ isActive: true }),
      ServiceableCity.countDocuments({ isActive: false }),
      ServiceableCity.aggregate([
        { $group: { _id: null, total: { $sum: '$bookingCount' } } }
      ]),
      ServiceableCity.find({ isActive: true })
        .sort({ bookingCount: -1 })
        .limit(5)
        .select('city state bookingCount lastBookingAt')
        .lean()
    ]);
    
    const stats = {
      totalCities,
      activeCities,
      inactiveCities,
      totalBookings: totalBookings[0]?.total || 0,
      topCitiesByBookings: topCities
    };
    
    console.log('✅ [Admin - City Stats] Stats generated:', stats);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [Admin - City Stats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate city statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   GET /api/admin/serviceable-cities/:id
 * @desc    Get a specific serviceable city
 * @access  Private (Admin only)
 */
export const getServiceableCityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 [Admin - Get City] Fetching city:', id);
    
    const city = await ServiceableCity.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    
    if (!city) {
      console.warn('⚠️ [Admin - Get City] City not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Serviceable city not found'
      });
    }
    
    console.log('✅ [Admin - Get City] City found:', city.city);
    
    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error('❌ [Admin - Get City] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function normalizeAndValidatePincodes(value) {
  if (value == null) return { valid: [], invalid: [] };
  const raw = Array.isArray(value) ? value : [value];
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const v of raw) {
    const p = String(v).trim();
    if (!p) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    if (PINCODE_REGEX.test(p)) valid.push(p);
    else invalid.push(p);
  }
  return { valid, invalid };
}

/**
 * @route   POST /api/admin/serviceable-cities
 * @desc    Create a new serviceable city
 * @access  Private (Admin only)
 */
export const createServiceableCity = async (req, res) => {
  try {
    const {
      city,
      state,
      displayName,
      priority,
      coveragePincodes,
      description,
      notes,
      launchDate
    } = req.body;
    
    console.log('➕ [Admin - Create City] Creating new city:', city);
    
    // Validate required fields
    if (!city || !state) {
      return res.status(400).json({
        success: false,
        message: 'City and state are required'
      });
    }

    const { valid: validPincodes, invalid: invalidPincodes } = normalizeAndValidatePincodes(coveragePincodes);
    if (validPincodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid 6-digit coverage pincode is required (e.g. 823001)'
      });
    }
    if (invalidPincodes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid pincodes (must be 6 digits, 1-9 first): ${invalidPincodes.join(', ')}`
      });
    }
    
    // Check if city already exists
    const existingCity = await ServiceableCity.findOne({
      city: new RegExp(`^${city}$`, 'i'),
      state: new RegExp(`^${state}$`, 'i')
    });
    
    if (existingCity) {
      console.warn('⚠️ [Admin - Create City] City already exists:', city);
      return res.status(400).json({
        success: false,
        message: `${city}, ${state} is already in the serviceable cities list`
      });
    }
    
    // Create new city
    const newCity = await ServiceableCity.create({
      city,
      state,
      displayName,
      priority: priority || 0,
      coveragePincodes: validPincodes,
      description,
      notes,
      launchDate: launchDate || null,
      createdBy: req.user?.userId || req.user?.id || req.user?._id || null,
      isActive: true
    });
    
    // Invalidate cache
    invalidateCityCache();
    
    console.log('✅ [Admin - Create City] City created successfully:', newCity.city);
    
    res.status(201).json({
      success: true,
      data: newCity,
      message: `${newCity.city}, ${newCity.state} has been added to serviceable cities`
    });
  } catch (error) {
    console.error('❌ [Admin - Create City] Error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This city already exists in the serviceable cities list'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create serviceable city',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   PUT /api/admin/serviceable-cities/:id
 * @desc    Update a serviceable city
 * @access  Private (Admin only)
 */
export const updateServiceableCity = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    console.log('✏️ [Admin - Update City] Updating city:', id);
    
    // Validate coveragePincodes if provided
    if (Object.prototype.hasOwnProperty.call(updateData, 'coveragePincodes')) {
      const { valid: validPincodes, invalid: invalidPincodes } = normalizeAndValidatePincodes(updateData.coveragePincodes);
      if (validPincodes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid 6-digit coverage pincode is required'
        });
      }
      if (invalidPincodes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pincodes (must be 6 digits): ${invalidPincodes.join(', ')}`
        });
      }
      updateData.coveragePincodes = validPincodes;
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.bookingCount;
    delete updateData.lastBookingAt;
    
    // Add updatedBy field
    updateData.updatedBy = req.user?.userId || null;
    
    // Update city
    const updatedCity = await ServiceableCity.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCity) {
      console.warn('⚠️ [Admin - Update City] City not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Serviceable city not found'
      });
    }
    
    // Invalidate cache
    invalidateCityCache();
    
    console.log('✅ [Admin - Update City] City updated:', updatedCity.city);
    
    res.status(200).json({
      success: true,
      data: updatedCity,
      message: `${updatedCity.city} has been updated successfully`
    });
  } catch (error) {
    console.error('❌ [Admin - Update City] Error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Another city with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update serviceable city',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   PATCH /api/admin/serviceable-cities/:id/toggle
 * @desc    Toggle active/inactive status
 * @access  Private (Admin only)
 */
export const toggleCityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 [Admin - Toggle City] Toggling status for:', id);
    
    const city = await ServiceableCity.findById(id);
    
    if (!city) {
      console.warn('⚠️ [Admin - Toggle City] City not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Serviceable city not found'
      });
    }
    
    // Toggle status
    await city.toggleActive();
    
    // Invalidate cache
    invalidateCityCache();
    
    console.log(`✅ [Admin - Toggle City] ${city.city} is now ${city.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    res.status(200).json({
      success: true,
      data: city,
      message: `${city.city} has been ${city.isActive ? 'activated' : 'deactivated'}`
    });
  } catch (error) {
    console.error('❌ [Admin - Toggle City] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle city status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   DELETE /api/admin/serviceable-cities/:id
 * @desc    Delete a serviceable city
 * @access  Private (Admin only)
 */
export const deleteServiceableCity = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ [Admin - Delete City] Deleting city:', id);
    
    const city = await ServiceableCity.findByIdAndDelete(id);
    
    if (!city) {
      console.warn('⚠️ [Admin - Delete City] City not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Serviceable city not found'
      });
    }
    
    // Invalidate cache
    invalidateCityCache();
    
    console.log('✅ [Admin - Delete City] City deleted:', city.city);
    
    res.status(200).json({
      success: true,
      message: `${city.city}, ${city.state} has been removed from serviceable cities`,
      data: { deletedCity: city }
    });
  } catch (error) {
    console.error('❌ [Admin - Delete City] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete serviceable city',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getAllServiceableCities,
  getServiceableCityStats,
  getServiceableCityById,
  createServiceableCity,
  updateServiceableCity,
  toggleCityStatus,
  deleteServiceableCity
};




