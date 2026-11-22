import { prisma } from '../../platform/db/postgres.js';

function shapeAdminService(row) {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    price: row.price,
    priceDisplay: row.priceDisplay,
    duration: row.duration,
    isActive: row.isActive,
    isAvailable: row.isAvailable,
    mobileImage: row.mobileImage,
    image: row.images || [],
    categoryId: row.categoryId,
    categoryName: row.category?.name || null,
    showInPopularNearYou: row.showInPopularNearYou ?? false,
    popularNearYouOrder: row.popularNearYouOrder ?? 0,
  };
}

/**
 * GET /api/admin/popular-near-you
 * Selected (ordered) + available services to add
 */
export const getPopularNearYouAdmin = async (req, res) => {
  try {
    const [selected, available] = await Promise.all([
      prisma.service.findMany({
        where: { showInPopularNearYou: true },
        orderBy: [{ popularNearYouOrder: 'asc' }, { createdAt: 'asc' }],
        include: { category: { select: { name: true } } },
      }),
      prisma.service.findMany({
        where: {
          isActive: true,
          showInPopularNearYou: false,
        },
        orderBy: [{ name: 'asc' }],
        include: { category: { select: { name: true } } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        selected: selected.map(shapeAdminService),
        available: available.map(shapeAdminService),
        selectedCount: selected.length,
        availableCount: available.length,
      },
    });
  } catch (error) {
    console.error('getPopularNearYouAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load Popular Near You list',
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/popular-near-you
 * Body: { serviceIds: string[] } — full ordered list of curated services
 */
export const setPopularNearYouAdmin = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.serviceIds) ? req.body.serviceIds : null;
    if (!rawIds) {
      return res.status(400).json({
        success: false,
        message: 'serviceIds array is required',
      });
    }

    const serviceIds = [...new Set(rawIds.map((id) => String(id).trim()).filter(Boolean))];

    if (serviceIds.length > 0) {
      const found = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((s) => s.id));
      const missing = serviceIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Unknown service id(s): ${missing.slice(0, 5).join(', ')}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.service.updateMany({
        where: { showInPopularNearYou: true },
        data: { showInPopularNearYou: false, popularNearYouOrder: 0 },
      });

      for (let i = 0; i < serviceIds.length; i += 1) {
        await tx.service.update({
          where: { id: serviceIds[i] },
          data: {
            showInPopularNearYou: true,
            popularNearYouOrder: i + 1,
          },
        });
      }
    });

    const selected = await prisma.service.findMany({
      where: { showInPopularNearYou: true },
      orderBy: [{ popularNearYouOrder: 'asc' }, { createdAt: 'asc' }],
      include: { category: { select: { name: true } } },
    });

    return res.status(200).json({
      success: true,
      message: 'Popular Near You list updated',
      data: {
        selected: selected.map(shapeAdminService),
        selectedCount: selected.length,
      },
    });
  } catch (error) {
    console.error('setPopularNearYouAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Popular Near You list',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/popular-near-you/:serviceId
 * Add one service at the end of the curated list
 */
export const addPopularNearYouAdmin = async (req, res) => {
  try {
    const serviceId = String(req.params.serviceId || '');
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.showInPopularNearYou) {
      return res.status(200).json({
        success: true,
        message: 'Service is already in Popular Near You',
        data: { id: service.id },
      });
    }

    const agg = await prisma.service.aggregate({
      where: { showInPopularNearYou: true },
      _max: { popularNearYouOrder: true },
    });
    const nextOrder = (agg._max.popularNearYouOrder || 0) + 1;

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        showInPopularNearYou: true,
        popularNearYouOrder: nextOrder,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Service added to Popular Near You',
      data: { id: serviceId, popularNearYouOrder: nextOrder },
    });
  } catch (error) {
    console.error('addPopularNearYouAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add service',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/popular-near-you/:serviceId
 */
export const removePopularNearYouAdmin = async (req, res) => {
  try {
    const serviceId = String(req.params.serviceId || '');
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        showInPopularNearYou: false,
        popularNearYouOrder: 0,
      },
    });

    // Compact remaining order values
    const remaining = await prisma.service.findMany({
      where: { showInPopularNearYou: true },
      orderBy: [{ popularNearYouOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });

    await prisma.$transaction(
      remaining.map((row, index) =>
        prisma.service.update({
          where: { id: row.id },
          data: { popularNearYouOrder: index + 1 },
        })
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Service removed from Popular Near You',
    });
  } catch (error) {
    console.error('removePopularNearYouAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove service',
      error: error.message,
    });
  }
};
