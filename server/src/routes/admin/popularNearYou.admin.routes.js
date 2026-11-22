import express from 'express';
import { checkAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import {
  getPopularNearYouAdmin,
  setPopularNearYouAdmin,
  addPopularNearYouAdmin,
  removePopularNearYouAdmin,
} from '../../controllers/admin/popularNearYou.admin.controller.js';

const popularNearYouAdminRouter = express.Router();

popularNearYouAdminRouter.get('/', checkAuth, requireAdmin, getPopularNearYouAdmin);
popularNearYouAdminRouter.put('/', checkAuth, requireAdmin, setPopularNearYouAdmin);
popularNearYouAdminRouter.post('/:serviceId', checkAuth, requireAdmin, addPopularNearYouAdmin);
popularNearYouAdminRouter.delete('/:serviceId', checkAuth, requireAdmin, removePopularNearYouAdmin);

export default popularNearYouAdminRouter;
