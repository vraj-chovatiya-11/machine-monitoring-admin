import { Router } from 'express';

import { requireAuth } from '../../middleware/index.js';
import { downloadReport, generateMachineReport, listReports } from '../controllers/report.js';
import { validateGenerateMachineReport, validateReportListQuery } from '../validations/report.js';

const router = Router();

router.post(
  '/machine-performance',
  ...requireAuth('superadmin', 'admin'),
  validateGenerateMachineReport,
  generateMachineReport
);

router.get('/', ...requireAuth('superadmin', 'admin'), validateReportListQuery, listReports);

router.get('/:reportId/download', ...requireAuth('superadmin', 'admin'), downloadReport);

export default router;
import { Router } from 'express';

import {
  generateMachineReport,
  listReports,
  downloadReport,
} from '../controllers/report.js';
import { validateGenerateMachineReport, validateReportListQuery } from '../validations/report.js';
import { requireAuth } from '../../middleware/index.js';

const router = Router();

router.post(
  '/machine-performance',
  ...requireAuth('superadmin', 'admin'),
  validateGenerateMachineReport,
  generateMachineReport
);

router.get('/', ...requireAuth('superadmin', 'admin'), validateReportListQuery, listReports);

router.get('/:reportId/download', ...requireAuth('superadmin', 'admin'), downloadReport);

export default router;

