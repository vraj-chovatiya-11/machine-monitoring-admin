import { Router } from 'express';

import machineRoutes from './machine.js';
import factoryRoutes from './factory.js';
import userRoutes from './user.js';
import reportRoutes from './report.js';

const router = Router();

router.use('/machine', machineRoutes);
router.use('/factories', factoryRoutes);
router.use('/users', userRoutes);
router.use('/reports', reportRoutes);

export default router;

