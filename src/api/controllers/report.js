import fs from 'node:fs';
import path from 'node:path';

import { ApplicationError, logAndForwardError, respondWithSuccess } from '../../helper/index.js';
import {
  generateMachinePerformanceReportService,
  getReportForDownloadService,
  listReportsService,
} from '../services/reportService.js';

const resolveDownloadContentType = (format) => {
  if (format === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/pdf';
};

export const generateMachineReport = async (req, res, next) => {
  try {
    const payload = req.reportGenerationPayload;
    const report = await generateMachinePerformanceReportService({
      requester: req.user,
      adminId: payload.admin_id,
      machineNumber: payload.machine_number,
      rangeType: payload.range_type,
      targetDate: payload.date,
      format: payload.format,
    });

    respondWithSuccess(res, 201, report);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to generate machine performance report');
  }
};

export const listReports = async (req, res, next) => {
  try {
    const { page, limit, admin_id: adminId, filters } = req.reportListQuery;
    const result = await listReportsService({
      requester: req.user,
      adminId,
      page,
      limit,
      filters,
    });

    respondWithSuccess(res, 200, result);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to list reports');
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const report = await getReportForDownloadService({
      requester: req.user,
      reportId,
    });

    const absolutePath = path.isAbsolute(report.file_path)
      ? report.file_path
      : path.join(process.cwd(), report.file_path);

    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
    } catch (_error) {
      throw new ApplicationError('Report file is no longer available on the server', 410);
    }

    res.setHeader('Content-Type', resolveDownloadContentType(report.file_format));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.file_name ?? `report-${report.id}.${report.file_format}`}"`
    );

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (error) => {
      stream.destroy();
      next(error);
    });
    stream.pipe(res);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to download report');
  }
};
import fs from 'node:fs';
import path from 'node:path';

import { ApplicationError, logAndForwardError, respondWithSuccess } from '../../helper/index.js';
import {
  generateMachinePerformanceReportService,
  getReportForDownloadService,
  listReportsService,
} from '../services/reportService.js';

const resolveDownloadContentType = (format) => {
  if (format === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/pdf';
};

export const generateMachineReport = async (req, res, next) => {
  try {
    const payload = req.reportGenerationPayload;
    const report = await generateMachinePerformanceReportService({
      requester: req.user,
      adminId: payload.admin_id,
      machineNumber: payload.machine_number,
      rangeType: payload.range_type,
      targetDate: payload.date,
      format: payload.format,
    });

    respondWithSuccess(res, 201, report);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to generate machine performance report');
  }
};

export const listReports = async (req, res, next) => {
  try {
    const { page, limit, admin_id: adminId, filters } = req.reportListQuery;
    const result = await listReportsService({
      requester: req.user,
      adminId,
      page,
      limit,
      filters,
    });

    respondWithSuccess(res, 200, result);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to list reports');
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const report = await getReportForDownloadService({
      requester: req.user,
      reportId,
    });

    const absolutePath = path.isAbsolute(report.file_path)
      ? report.file_path
      : path.join(process.cwd(), report.file_path);

    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
    } catch (_error) {
      throw new ApplicationError('Report file is no longer available on the server', 410);
    }

    res.setHeader('Content-Type', resolveDownloadContentType(report.file_format));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.file_name ?? `report-${report.id}.${report.file_format}`}"`
    );

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (error) => {
      stream.destroy();
      next(error);
    });
    stream.pipe(res);
  } catch (error) {
    logAndForwardError(req, error, next, 'Failed to download report');
  }
};

