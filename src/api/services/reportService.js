import fs from 'node:fs';
import path from 'node:path';

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import {
  createReportExport,
  findReportExportById,
  findReportExports,
  updateReportExportById,
} from '../../database/repositories/reportExportRepository.js';
import { findMachineByFacMachineNumber } from '../../database/repositories/machine.js';
import { getStopTimes } from '../../database/repositories/machineStopTimeRepository.js';
import MachineLogModel from '../../database/models/machineLog.js';
import {
  DEFAULT_REPORT_DIRECTORY,
  REPORT_FORMATS,
  REPORT_RANGE_TYPES,
  REPORT_STATUSES,
  REPORT_TYPES,
} from '../../constants/report.js';
import { ApplicationError, logging, normalizeId } from '../../helper/index.js';
import { buildPaginationMeta } from '../../helper/pagination.js';

const REPORT_DIRECTORY = path.join(process.cwd(), DEFAULT_REPORT_DIRECTORY);

const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ensureDirectory = async (directoryPath) => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
};

const toPosixPath = (value) => value.split(path.sep).join(path.posix.sep);

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
};

const buildRangeWindow = (rangeType, dateInput) => {
  const normalizedType =
    rangeType === REPORT_RANGE_TYPES.LAST_MONTH ? REPORT_RANGE_TYPES.LAST_MONTH : REPORT_RANGE_TYPES.DAILY;
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    throw new ApplicationError('Invalid date provided', 400);
  }

  let startDate = new Date(baseDate);
  let endDate = new Date(baseDate);

  if (normalizedType === REPORT_RANGE_TYPES.LAST_MONTH) {
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const startEpoch = Math.floor(startDate.getTime() / 1000);
  const endEpoch = Math.floor(endDate.getTime() / 1000);
  const durationSeconds = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));

  return {
    rangeType: normalizedType,
    label:
      normalizedType === REPORT_RANGE_TYPES.LAST_MONTH
        ? `Last 30 Days (${formatDateString(startDate)} → ${formatDateString(endDate)})`
        : `Daily (${formatDateString(startDate)})`,
    startDate,
    endDate,
    startDateStr: formatDateString(startDate),
    endDateStr: formatDateString(endDate),
    startEpoch,
    endEpoch,
    durationSeconds,
  };
};

const aggregateMachineMetrics = async ({ adminId, machineNumber, startEpoch, endEpoch }) => {
  const matchStage = {
    user_id: adminId,
    timestamp_epoch: {
      $gte: startEpoch,
      $lte: endEpoch,
    },
  };

  const pipeline = [
    { $match: matchStage },
    { $sort: { timestamp_epoch: 1 } },
    { $unwind: '$machines' },
    { $match: { 'machines.machineNumber': machineNumber } },
    {
      $group: {
        _id: '$machines.machineNumber',
        averageRpm: { $avg: '$machines.fre_RPM' },
        minRpm: { $min: '$machines.fre_RPM' },
        maxRpm: { $max: '$machines.fre_RPM' },
        totalStopEvents: { $sum: '$machines.machineStopEvents' },
        sampleCount: { $sum: 1 },
        firstTimestamp: { $first: '$timestamp_epoch' },
        lastTimestamp: { $last: '$timestamp_epoch' },
      },
    },
  ];

  const [result] = await MachineLogModel.aggregate(pipeline).exec();

  return {
    averageRpm: result?.averageRpm ?? 0,
    minRpm: result?.minRpm ?? 0,
    maxRpm: result?.maxRpm ?? 0,
    totalStopEvents: result?.totalStopEvents ?? 0,
    sampleCount: result?.sampleCount ?? 0,
    firstTimestamp: result?.firstTimestamp ?? startEpoch,
    lastTimestamp: result?.lastTimestamp ?? endEpoch,
  };
};

const summarizeStopTimes = (records = []) =>
  records.reduce(
    (acc, record) => {
      const duration = record?.stop_time ?? 0;
      acc.total += duration;
      if (record?.shift === 'day') {
        acc.day += duration;
      } else if (record?.shift === 'night') {
        acc.night += duration;
      }
      acc.breakdown.push({
        date: record.date,
        shift: record.shift,
        stop_time: duration,
      });
      return acc;
    },
    { day: 0, night: 0, total: 0, breakdown: [] }
  );

const buildRollupSummary = ({ machine, metrics, stopSummary, range, format }) => {
  const downtimeSeconds = stopSummary.total;
  const uptimeSeconds = Math.max(0, range.durationSeconds - downtimeSeconds);
  const availability =
    range.durationSeconds > 0 ? Number(((uptimeSeconds / range.durationSeconds) * 100).toFixed(2)) : 0;

  return {
    machine_id: machine.id,
    machine_name: machine.machine_name,
    machine_number: machine.fac_machine_number,
    factory_id: machine.factory_id,
    admin_id: machine.admin_id,
    report_type: REPORT_TYPES.MACHINE_PERFORMANCE,
    range_type: range.rangeType,
    range_label: range.label,
    start_date: range.startDateStr,
    end_date: range.endDateStr,
    total_duration_seconds: range.durationSeconds,
    total_samples: metrics.sampleCount,
    average_rpm: Number(metrics.averageRpm?.toFixed?.(2) ?? metrics.averageRpm ?? 0),
    min_rpm: metrics.minRpm,
    max_rpm: metrics.maxRpm,
    total_stop_events: metrics.totalStopEvents,
    downtime_seconds: downtimeSeconds,
    uptime_seconds: uptimeSeconds,
    availability_percentage: availability,
    day_stop_seconds: stopSummary.day,
    night_stop_seconds: stopSummary.night,
    shift_breakdown: stopSummary.breakdown,
    file_format: format,
  };
};

const writePdfReport = async ({ summary, shiftBreakdown }) => {
  await ensureDirectory(REPORT_DIRECTORY);
  const timestamp = Date.now();
  const fileName = `machine-report-${summary.machine_number}-${summary.range_type}-${timestamp}.pdf`;
  const filePath = path.join(REPORT_DIRECTORY, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('Machine Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Machine: ${summary.machine_name} (#${summary.machine_number})`);
    doc.text(`Factory ID: ${summary.factory_id}`);
    doc.text(`Range: ${summary.range_label}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);

    doc.moveDown();
    doc.fontSize(14).text('Key Metrics');
    doc.fontSize(12);
    const metrics = [
      ['Average RPM', summary.average_rpm?.toFixed ? summary.average_rpm : Number(summary.average_rpm ?? 0).toFixed(2)],
      ['Min RPM', summary.min_rpm],
      ['Max RPM', summary.max_rpm],
      ['Total Samples', summary.total_samples],
      ['Total Stop Events', summary.total_stop_events],
      ['Downtime (hh:mm:ss)', formatDuration(summary.downtime_seconds)],
      ['Uptime (hh:mm:ss)', formatDuration(summary.uptime_seconds)],
      ['Availability (%)', `${summary.availability_percentage}%`],
    ];

    metrics.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`);
    });

    doc.moveDown();
    doc.fontSize(14).text('Shift Breakdown (Stop Time)');
    doc.fontSize(12);
    if (shiftBreakdown.length === 0) {
      doc.text('No stop events recorded for this range.');
    } else {
      shiftBreakdown.forEach((entry) => {
        doc.text(`${entry.date} [${entry.shift}] - ${formatDuration(entry.stop_time)}`);
      });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = await fs.promises.stat(filePath);
  return { fileName, filePath, fileSize: stats.size };
};

const writeXlsxReport = async ({ summary, shiftBreakdown }) => {
  await ensureDirectory(REPORT_DIRECTORY);
  const timestamp = Date.now();
  const fileName = `machine-report-${summary.machine_number}-${summary.range_type}-${timestamp}.xlsx`;
  const filePath = path.join(REPORT_DIRECTORY, fileName);

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 },
  ];

  const summaryRows = [
    ['Machine Name', summary.machine_name],
    ['Machine Number', summary.machine_number],
    ['Factory ID', summary.factory_id],
    ['Range', summary.range_label],
    ['Average RPM', summary.average_rpm],
    ['Min RPM', summary.min_rpm],
    ['Max RPM', summary.max_rpm],
    ['Total Samples', summary.total_samples],
    ['Total Stop Events', summary.total_stop_events],
    ['Downtime (hh:mm:ss)', formatDuration(summary.downtime_seconds)],
    ['Uptime (hh:mm:ss)', formatDuration(summary.uptime_seconds)],
    ['Availability (%)', summary.availability_percentage],
  ];

  summaryRows.forEach(([metric, value]) => summarySheet.addRow({ metric, value }));

  const shiftSheet = workbook.addWorksheet('Shift Breakdown');
  shiftSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Shift', key: 'shift', width: 10 },
    { header: 'Stop Time (seconds)', key: 'stopSeconds', width: 20 },
    { header: 'Stop Time (hh:mm:ss)', key: 'stopFormatted', width: 25 },
  ];

  if (shiftBreakdown.length === 0) {
    shiftSheet.addRow({ date: 'N/A', shift: '-', stopSeconds: 0, stopFormatted: '00:00:00' });
  } else {
    shiftBreakdown.forEach((entry) => {
      shiftSheet.addRow({
        date: entry.date,
        shift: entry.shift,
        stopSeconds: entry.stop_time,
        stopFormatted: formatDuration(entry.stop_time),
      });
    });
  }

  await workbook.xlsx.writeFile(filePath);
  const stats = await fs.promises.stat(filePath);
  return { fileName, filePath, fileSize: stats.size };
};

const assertAccessToAdmin = (requester, adminId) => {
  if (!requester) {
    throw new ApplicationError('Authentication required', 401);
  }

  const normalizedAdminId = normalizeId(adminId ?? requester.id);
  if (normalizedAdminId === null) {
    throw new ApplicationError('Invalid admin ID', 400);
  }

  if (requester.role !== 'superadmin' && normalizedAdminId !== requester.id) {
    throw new ApplicationError('You are not authorized to access this resource', 403);
  }

  return normalizedAdminId;
};

const sanitizeReport = (report, { includeFilePath = false } = {}) => {
  if (!report) {
    return null;
  }
  const sanitized = { ...report };
  if (!includeFilePath) {
    delete sanitized.file_path;
  }
  return sanitized;
};

export const generateMachinePerformanceReportService = async ({
  requester,
  adminId,
  machineNumber,
  rangeType,
  targetDate,
  format = REPORT_FORMATS.PDF,
}) => {
  const normalizedMachineNumber = normalizeId(machineNumber);
  if (normalizedMachineNumber === null) {
    throw new ApplicationError('Machine number is required', 400);
  }

  const resolvedAdminId = assertAccessToAdmin(requester, adminId);
  const safeFormat = Object.values(REPORT_FORMATS).includes(format) ? format : REPORT_FORMATS.PDF;
  const range = buildRangeWindow(rangeType, targetDate);

  const machine = await findMachineByFacMachineNumber(normalizedMachineNumber, resolvedAdminId, { lean: true });
  if (!machine) {
    throw new ApplicationError('Machine not found for this admin', 404);
  }

  const metrics = await aggregateMachineMetrics({
    adminId: resolvedAdminId,
    machineNumber: normalizedMachineNumber,
    startEpoch: range.startEpoch,
    endEpoch: range.endEpoch,
  });

  const stopTimeRecords = await getStopTimes(
    resolvedAdminId,
    machine.factory_id,
    normalizedMachineNumber,
    range.startDateStr,
    range.endDateStr
  );
  const stopSummary = summarizeStopTimes(stopTimeRecords);
  const rollupSummary = buildRollupSummary({
    machine,
    metrics,
    stopSummary,
    range,
    format: safeFormat,
  });

  const pendingReport = await createReportExport({
    admin_id: resolvedAdminId,
    factory_id: machine.factory_id,
    machine_number: normalizedMachineNumber,
    report_type: REPORT_TYPES.MACHINE_PERFORMANCE,
    range_type: range.rangeType,
    start_date: range.startDateStr,
    end_date: range.endDateStr,
    file_format: safeFormat,
    status: REPORT_STATUSES.PROCESSING,
    requested_by: requester.id,
    rollup_summary: rollupSummary,
  });

  try {
    const fileResult =
      safeFormat === REPORT_FORMATS.XLSX
        ? await writeXlsxReport({ summary: rollupSummary, shiftBreakdown: stopSummary.breakdown })
        : await writePdfReport({ summary: rollupSummary, shiftBreakdown: stopSummary.breakdown });

    const relativePath = toPosixPath(path.relative(process.cwd(), fileResult.filePath));
    await updateReportExportById(pendingReport.id, {
      status: REPORT_STATUSES.READY,
      file_name: fileResult.fileName,
      file_path: relativePath,
      file_size: fileResult.fileSize,
      rollup_summary: rollupSummary,
      error_message: null,
    });
  } catch (error) {
    logging.error({
      message: 'Failed to generate machine performance report',
      adminId: resolvedAdminId,
      machineNumber: normalizedMachineNumber,
      error: error.message,
    });
    await updateReportExportById(pendingReport.id, {
      status: REPORT_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }

  const finalReport = await findReportExportById(pendingReport.id, { lean: true });
  return sanitizeReport(finalReport);
};

export const listReportsService = async ({ requester, adminId, page = 1, limit = 10, filters = {} }) => {
  const resolvedAdminId = assertAccessToAdmin(requester, adminId);

  const normalizedMachineNumber =
    filters.machine_number !== undefined && filters.machine_number !== null
      ? normalizeId(filters.machine_number)
      : undefined;

  const rangeFilter =
    filters.range_type && Object.values(REPORT_RANGE_TYPES).includes(filters.range_type)
      ? filters.range_type
      : undefined;

  const formatFilter =
    filters.file_format && Object.values(REPORT_FORMATS).includes(filters.file_format)
      ? filters.file_format
      : undefined;

  const statusFilter =
    filters.status && Object.values(REPORT_STATUSES).includes(filters.status) ? filters.status : undefined;

  const queryFilters = {
    admin_id: resolvedAdminId,
    machine_number: normalizedMachineNumber ?? undefined,
    range_type: rangeFilter,
    file_format: formatFilter,
    status: statusFilter,
  };

  const parsedPage = typeof page === 'string' ? Number.parseInt(page, 10) : page;
  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit =
    typeof limit === 'string' && limit.toLowerCase() === 'all'
      ? 'all'
      : typeof limit === 'string'
      ? Number.parseInt(limit, 10)
      : limit;

  const normalizedLimit =
    parsedLimit === 'all'
      ? 'all'
      : Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : 10;

  const result = await findReportExports({
    filters: queryFilters,
    page: normalizedPage,
    limit: normalizedLimit,
    sort: { created_at: -1 },
    options: { lean: true },
  });

  return {
    data: result.data.map((report) => sanitizeReport(report)),
    pagination: buildPaginationMeta(result.page, result.limit, result.total),
  };
};

export const getReportForDownloadService = async ({ requester, reportId }) => {
  const normalizedReportId = normalizeId(reportId);
  if (normalizedReportId === null) {
    throw new ApplicationError('Invalid report id', 400);
  }

  const report = await findReportExportById(normalizedReportId, { lean: true });
  if (!report) {
    throw new ApplicationError('Report not found', 404);
  }

  const resolvedAdminId = assertAccessToAdmin(requester, report.admin_id);
  if (resolvedAdminId !== report.admin_id && requester.role !== 'superadmin') {
    throw new ApplicationError('You are not authorized to download this report', 403);
  }

  if (report.status !== REPORT_STATUSES.READY || !report.file_path) {
    throw new ApplicationError('Report is not ready for download', 409);
  }

  return report;
};
import fs from 'node:fs';
import path from 'node:path';

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import {
  createReportExport,
  findReportExportById,
  findReportExports,
  updateReportExportById,
} from '../../database/repositories/reportExportRepository.js';
import { findMachineByFacMachineNumber } from '../../database/repositories/machine.js';
import { getStopTimes } from '../../database/repositories/machineStopTimeRepository.js';
import MachineLogModel from '../../database/models/machineLog.js';
import {
  DEFAULT_REPORT_DIRECTORY,
  REPORT_FORMATS,
  REPORT_RANGE_TYPES,
  REPORT_STATUSES,
  REPORT_TYPES,
} from '../../constants/report.js';
import { ApplicationError, logging, normalizeId } from '../../helper/index.js';
import { buildPaginationMeta } from '../../helper/pagination.js';

const REPORT_DIRECTORY = path.join(process.cwd(), DEFAULT_REPORT_DIRECTORY);

const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ensureDirectory = async (directoryPath) => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
};

const toPosixPath = (value) => value.split(path.sep).join(path.posix.sep);

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
};

const buildRangeWindow = (rangeType, dateInput) => {
  const normalizedType = rangeType === REPORT_RANGE_TYPES.LAST_MONTH ? REPORT_RANGE_TYPES.LAST_MONTH : REPORT_RANGE_TYPES.DAILY;
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    throw new ApplicationError('Invalid date provided', 400);
  }

  let startDate = new Date(baseDate);
  let endDate = new Date(baseDate);

  if (normalizedType === REPORT_RANGE_TYPES.LAST_MONTH) {
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const startEpoch = Math.floor(startDate.getTime() / 1000);
  const endEpoch = Math.floor(endDate.getTime() / 1000);
  const durationSeconds = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));

  return {
    rangeType: normalizedType,
    label:
      normalizedType === REPORT_RANGE_TYPES.LAST_MONTH
        ? `Last 30 Days (${formatDateString(startDate)} → ${formatDateString(endDate)})`
        : `Daily (${formatDateString(startDate)})`,
    startDate,
    endDate,
    startDateStr: formatDateString(startDate),
    endDateStr: formatDateString(endDate),
    startEpoch,
    endEpoch,
    durationSeconds,
  };
};

const aggregateMachineMetrics = async ({ adminId, machineNumber, startEpoch, endEpoch }) => {
  const matchStage = {
    user_id: adminId,
    timestamp_epoch: {
      $gte: startEpoch,
      $lte: endEpoch,
    },
  };

  const pipeline = [
    { $match: matchStage },
    { $sort: { timestamp_epoch: 1 } },
    { $unwind: '$machines' },
    { $match: { 'machines.machineNumber': machineNumber } },
    {
      $group: {
        _id: '$machines.machineNumber',
        averageRpm: { $avg: '$machines.fre_RPM' },
        minRpm: { $min: '$machines.fre_RPM' },
        maxRpm: { $max: '$machines.fre_RPM' },
        totalStopEvents: { $sum: '$machines.machineStopEvents' },
        sampleCount: { $sum: 1 },
        firstTimestamp: { $first: '$timestamp_epoch' },
        lastTimestamp: { $last: '$timestamp_epoch' },
      },
    },
  ];

  const [result] = await MachineLogModel.aggregate(pipeline).exec();

  return {
    averageRpm: result?.averageRpm ?? 0,
    minRpm: result?.minRpm ?? 0,
    maxRpm: result?.maxRpm ?? 0,
    totalStopEvents: result?.totalStopEvents ?? 0,
    sampleCount: result?.sampleCount ?? 0,
    firstTimestamp: result?.firstTimestamp ?? startEpoch,
    lastTimestamp: result?.lastTimestamp ?? endEpoch,
  };
};

const summarizeStopTimes = (records = []) => {
  return records.reduce(
    (acc, record) => {
      const duration = record?.stop_time ?? 0;
      acc.total += duration;
      if (record?.shift === 'day') {
        acc.day += duration;
      } else if (record?.shift === 'night') {
        acc.night += duration;
      }
      acc.breakdown.push({
        date: record.date,
        shift: record.shift,
        stop_time: duration,
      });
      return acc;
    },
    { day: 0, night: 0, total: 0, breakdown: [] }
  );
};

const buildRollupSummary = ({ machine, metrics, stopSummary, range, format }) => {
  const downtimeSeconds = stopSummary.total;
  const uptimeSeconds = Math.max(0, range.durationSeconds - downtimeSeconds);
  const availability = range.durationSeconds > 0 ? Number(((uptimeSeconds / range.durationSeconds) * 100).toFixed(2)) : 0;

  return {
    machine_id: machine.id,
    machine_name: machine.machine_name,
    machine_number: machine.fac_machine_number,
    factory_id: machine.factory_id,
    admin_id: machine.admin_id,
    report_type: REPORT_TYPES.MACHINE_PERFORMANCE,
    range_type: range.rangeType,
    range_label: range.label,
    start_date: range.startDateStr,
    end_date: range.endDateStr,
    total_duration_seconds: range.durationSeconds,
    total_samples: metrics.sampleCount,
    average_rpm: Number(metrics.averageRpm?.toFixed?.(2) ?? metrics.averageRpm ?? 0),
    min_rpm: metrics.minRpm,
    max_rpm: metrics.maxRpm,
    total_stop_events: metrics.totalStopEvents,
    downtime_seconds: downtimeSeconds,
    uptime_seconds: uptimeSeconds,
    availability_percentage: availability,
    day_stop_seconds: stopSummary.day,
    night_stop_seconds: stopSummary.night,
    shift_breakdown: stopSummary.breakdown,
    file_format: format,
  };
};

const writePdfReport = async ({ summary, shiftBreakdown }) => {
  await ensureDirectory(REPORT_DIRECTORY);
  const timestamp = Date.now();
  const fileName = `machine-report-${summary.machine_number}-${summary.range_type}-${timestamp}.pdf`;
  const filePath = path.join(REPORT_DIRECTORY, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('Machine Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Machine: ${summary.machine_name} (#${summary.machine_number})`);
    doc.text(`Factory ID: ${summary.factory_id}`);
    doc.text(`Range: ${summary.range_label}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);

    doc.moveDown();
    doc.fontSize(14).text('Key Metrics');
    doc.fontSize(12);
    const metrics = [
      ['Average RPM', summary.average_rpm?.toFixed ? summary.average_rpm : Number(summary.average_rpm ?? 0).toFixed(2)],
      ['Min RPM', summary.min_rpm],
      ['Max RPM', summary.max_rpm],
      ['Total Samples', summary.total_samples],
      ['Total Stop Events', summary.total_stop_events],
      ['Downtime (hh:mm:ss)', formatDuration(summary.downtime_seconds)],
      ['Uptime (hh:mm:ss)', formatDuration(summary.uptime_seconds)],
      ['Availability (%)', `${summary.availability_percentage}%`],
    ];

    metrics.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`);
    });

    doc.moveDown();
    doc.fontSize(14).text('Shift Breakdown (Stop Time)');
    doc.fontSize(12);
    if (shiftBreakdown.length === 0) {
      doc.text('No stop events recorded for this range.');
    } else {
      shiftBreakdown.forEach((entry) => {
        doc.text(`${entry.date} [${entry.shift}] - ${formatDuration(entry.stop_time)}`);
      });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = await fs.promises.stat(filePath);
  return { fileName, filePath, fileSize: stats.size };
};

const writeXlsxReport = async ({ summary, shiftBreakdown }) => {
  await ensureDirectory(REPORT_DIRECTORY);
  const timestamp = Date.now();
  const fileName = `machine-report-${summary.machine_number}-${summary.range_type}-${timestamp}.xlsx`;
  const filePath = path.join(REPORT_DIRECTORY, fileName);

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 },
  ];

  const summaryRows = [
    ['Machine Name', summary.machine_name],
    ['Machine Number', summary.machine_number],
    ['Factory ID', summary.factory_id],
    ['Range', summary.range_label],
    ['Average RPM', summary.average_rpm],
    ['Min RPM', summary.min_rpm],
    ['Max RPM', summary.max_rpm],
    ['Total Samples', summary.total_samples],
    ['Total Stop Events', summary.total_stop_events],
    ['Downtime (hh:mm:ss)', formatDuration(summary.downtime_seconds)],
    ['Uptime (hh:mm:ss)', formatDuration(summary.uptime_seconds)],
    ['Availability (%)', summary.availability_percentage],
  ];

  summaryRows.forEach(([metric, value]) => summarySheet.addRow({ metric, value }));

  const shiftSheet = workbook.addWorksheet('Shift Breakdown');
  shiftSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Shift', key: 'shift', width: 10 },
    { header: 'Stop Time (seconds)', key: 'stopSeconds', width: 20 },
    { header: 'Stop Time (hh:mm:ss)', key: 'stopFormatted', width: 25 },
  ];

  if (shiftBreakdown.length === 0) {
    shiftSheet.addRow({ date: 'N/A', shift: '-', stopSeconds: 0, stopFormatted: '00:00:00' });
  } else {
    shiftBreakdown.forEach((entry) => {
      shiftSheet.addRow({
        date: entry.date,
        shift: entry.shift,
        stopSeconds: entry.stop_time,
        stopFormatted: formatDuration(entry.stop_time),
      });
    });
  }

  await workbook.xlsx.writeFile(filePath);
  const stats = await fs.promises.stat(filePath);
  return { fileName, filePath, fileSize: stats.size };
};

const assertAccessToAdmin = (requester, adminId) => {
  if (!requester) {
    throw new ApplicationError('Authentication required', 401);
  }

  const normalizedAdminId = normalizeId(adminId ?? requester.id);
  if (normalizedAdminId === null) {
    throw new ApplicationError('Invalid admin ID', 400);
  }

  if (requester.role !== 'superadmin' && normalizedAdminId !== requester.id) {
    throw new ApplicationError('You are not authorized to access this resource', 403);
  }

  return normalizedAdminId;
};

const sanitizeReport = (report, { includeFilePath = false } = {}) => {
  if (!report) {
    return null;
  }
  const sanitized = { ...report };
  if (!includeFilePath) {
    delete sanitized.file_path;
  }
  return sanitized;
};

export const generateMachinePerformanceReportService = async ({
  requester,
  adminId,
  machineNumber,
  rangeType,
  targetDate,
  format = REPORT_FORMATS.PDF,
}) => {
  const normalizedMachineNumber = normalizeId(machineNumber);
  if (normalizedMachineNumber === null) {
    throw new ApplicationError('Machine number is required', 400);
  }

  const resolvedAdminId = assertAccessToAdmin(requester, adminId);
  const safeFormat = Object.values(REPORT_FORMATS).includes(format) ? format : REPORT_FORMATS.PDF;
  const range = buildRangeWindow(rangeType, targetDate);

  const machine = await findMachineByFacMachineNumber(normalizedMachineNumber, resolvedAdminId, { lean: true });
  if (!machine) {
    throw new ApplicationError('Machine not found for this admin', 404);
  }

  const metrics = await aggregateMachineMetrics({
    adminId: resolvedAdminId,
    machineNumber: normalizedMachineNumber,
    startEpoch: range.startEpoch,
    endEpoch: range.endEpoch,
  });

  const stopTimeRecords = await getStopTimes(
    resolvedAdminId,
    machine.factory_id,
    normalizedMachineNumber,
    range.startDateStr,
    range.endDateStr
  );
  const stopSummary = summarizeStopTimes(stopTimeRecords);
  const rollupSummary = buildRollupSummary({
    machine,
    metrics,
    stopSummary,
    range,
    format: safeFormat,
  });

  const pendingReport = await createReportExport({
    admin_id: resolvedAdminId,
    factory_id: machine.factory_id,
    machine_number: normalizedMachineNumber,
    report_type: REPORT_TYPES.MACHINE_PERFORMANCE,
    range_type: range.rangeType,
    start_date: range.startDateStr,
    end_date: range.endDateStr,
    file_format: safeFormat,
    status: REPORT_STATUSES.PROCESSING,
    requested_by: requester.id,
    rollup_summary: rollupSummary,
  });

  try {
    const fileResult =
      safeFormat === REPORT_FORMATS.XLSX
        ? await writeXlsxReport({ summary: rollupSummary, shiftBreakdown: stopSummary.breakdown })
        : await writePdfReport({ summary: rollupSummary, shiftBreakdown: stopSummary.breakdown });

    const relativePath = toPosixPath(path.relative(process.cwd(), fileResult.filePath));
    await updateReportExportById(pendingReport.id, {
      status: REPORT_STATUSES.READY,
      file_name: fileResult.fileName,
      file_path: relativePath,
      file_size: fileResult.fileSize,
      rollup_summary: rollupSummary,
      error_message: null,
    });
  } catch (error) {
    logging.error({
      message: 'Failed to generate machine performance report',
      adminId: resolvedAdminId,
      machineNumber: normalizedMachineNumber,
      error: error.message,
    });
    await updateReportExportById(pendingReport.id, {
      status: REPORT_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }

  const finalReport = await findReportExportById(pendingReport.id, { lean: true });
  return sanitizeReport(finalReport);
};

export const listReportsService = async ({ requester, adminId, page = 1, limit = 10, filters = {} }) => {
  const resolvedAdminId = assertAccessToAdmin(requester, adminId);

  const normalizedMachineNumber =
    filters.machine_number !== undefined && filters.machine_number !== null
      ? normalizeId(filters.machine_number)
      : undefined;

  const rangeFilter =
    filters.range_type && Object.values(REPORT_RANGE_TYPES).includes(filters.range_type)
      ? filters.range_type
      : undefined;

  const formatFilter =
    filters.file_format && Object.values(REPORT_FORMATS).includes(filters.file_format)
      ? filters.file_format
      : undefined;

  const statusFilter =
    filters.status && Object.values(REPORT_STATUSES).includes(filters.status)
      ? filters.status
      : undefined;

  const queryFilters = {
    admin_id: resolvedAdminId,
    machine_number: normalizedMachineNumber ?? undefined,
    range_type: rangeFilter,
    file_format: formatFilter,
    status: statusFilter,
  };

  const parsedPage = typeof page === 'string' ? Number.parseInt(page, 10) : page;
  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit =
    typeof limit === 'string' && limit.toLowerCase() === 'all'
      ? 'all'
      : typeof limit === 'string'
      ? Number.parseInt(limit, 10)
      : limit;

  const normalizedLimit =
    parsedLimit === 'all'
      ? 'all'
      : Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : 10;

  const result = await findReportExports({
    filters: queryFilters,
    page: normalizedPage,
    limit: normalizedLimit,
    sort: { created_at: -1 },
    options: { lean: true },
  });

  return {
    data: result.data.map((report) => sanitizeReport(report)),
    pagination: buildPaginationMeta(result.page, result.limit, result.total),
  };
};

export const getReportForDownloadService = async ({ requester, reportId }) => {
  const normalizedReportId = normalizeId(reportId);
  if (normalizedReportId === null) {
    throw new ApplicationError('Invalid report id', 400);
  }

  const report = await findReportExportById(normalizedReportId, { lean: true });
  if (!report) {
    throw new ApplicationError('Report not found', 404);
  }

  const resolvedAdminId = assertAccessToAdmin(requester, report.admin_id);
  if (resolvedAdminId !== report.admin_id && requester.role !== 'superadmin') {
    throw new ApplicationError('You are not authorized to download this report', 403);
  }

  if (report.status !== REPORT_STATUSES.READY || !report.file_path) {
    throw new ApplicationError('Report is not ready for download', 409);
  }

  return report;
};

