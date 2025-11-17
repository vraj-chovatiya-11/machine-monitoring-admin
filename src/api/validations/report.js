import { ApplicationError, normalizeId, normalizePagination } from '../../helper/index.js';
import { REPORT_FORMATS, REPORT_RANGE_TYPES, REPORT_STATUSES } from '../../constants/report.js';

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validateGenerateMachineReport = (req, _res, next) => {
  const { machine_number, range_type, date, format, admin_id } = req.body ?? {};

  const normalizedMachineNumber = normalizeId(machine_number);
  if (normalizedMachineNumber === null) {
    next(new ApplicationError('machine_number is required and must be a positive integer', 400));
    return;
  }

  let normalizedAdminId;
  if (admin_id !== undefined) {
    normalizedAdminId = normalizeId(admin_id);
    if (normalizedAdminId === null) {
      next(new ApplicationError('admin_id must be a valid positive integer', 400));
      return;
    }
  }

  let normalizedRangeType = REPORT_RANGE_TYPES.DAILY;
  if (range_type && typeof range_type === 'string') {
    if (!Object.values(REPORT_RANGE_TYPES).includes(range_type)) {
      next(new ApplicationError('Invalid range_type provided', 400));
      return;
    }
    normalizedRangeType = range_type;
  }

  let normalizedDate;
  if (date !== undefined) {
    if (typeof date !== 'string' || !isValidDateString(date.trim())) {
      next(new ApplicationError('date must be in YYYY-MM-DD format', 400));
      return;
    }
    normalizedDate = date.trim();
  }

  let normalizedFormat = REPORT_FORMATS.PDF;
  if (format && typeof format === 'string') {
    if (!Object.values(REPORT_FORMATS).includes(format)) {
      next(new ApplicationError('format must be either pdf or xlsx', 400));
      return;
    }
    normalizedFormat = format;
  }

  req.reportGenerationPayload = {
    machine_number: normalizedMachineNumber,
    admin_id: normalizedAdminId,
    range_type: normalizedRangeType,
    date: normalizedDate,
    format: normalizedFormat,
  };

  next();
};

export const validateReportListQuery = (req, _res, next) => {
  const { page, limit } = normalizePagination(req.query.page, req.query.limit);
  const { admin_id, machine_number, range_type, file_format, status } = req.query;

  let normalizedAdminId;
  if (admin_id !== undefined) {
    normalizedAdminId = normalizeId(admin_id);
    if (normalizedAdminId === null) {
      next(new ApplicationError('admin_id must be a valid positive integer', 400));
      return;
    }
  }

  let normalizedMachineNumber;
  if (machine_number !== undefined) {
    normalizedMachineNumber = normalizeId(machine_number);
    if (normalizedMachineNumber === null) {
      next(new ApplicationError('machine_number must be a valid positive integer', 400));
      return;
    }
  }

  if (range_type && !Object.values(REPORT_RANGE_TYPES).includes(range_type)) {
    next(new ApplicationError('Invalid range_type provided', 400));
    return;
  }

  if (file_format && !Object.values(REPORT_FORMATS).includes(file_format)) {
    next(new ApplicationError('Invalid file_format provided', 400));
    return;
  }

  if (status && !Object.values(REPORT_STATUSES).includes(status)) {
    next(new ApplicationError('Invalid status provided', 400));
    return;
  }

  req.reportListQuery = {
    page,
    limit,
    admin_id: normalizedAdminId,
    filters: {
      machine_number: normalizedMachineNumber,
      range_type,
      file_format,
      status,
    },
  };

  next();
};
import {
  ApplicationError,
  normalizeId,
  normalizePagination,
} from '../../helper/index.js';
import {
  REPORT_FORMATS,
  REPORT_RANGE_TYPES,
  REPORT_STATUSES,
} from '../../constants/report.js';

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validateGenerateMachineReport = (req, _res, next) => {
  const { machine_number, range_type, date, format, admin_id } = req.body ?? {};

  const normalizedMachineNumber = normalizeId(machine_number);
  if (normalizedMachineNumber === null) {
    next(new ApplicationError('machine_number is required and must be a positive integer', 400));
    return;
  }

  let normalizedAdminId;
  if (admin_id !== undefined) {
    normalizedAdminId = normalizeId(admin_id);
    if (normalizedAdminId === null) {
      next(new ApplicationError('admin_id must be a valid positive integer', 400));
      return;
    }
  }

  let normalizedRangeType = REPORT_RANGE_TYPES.DAILY;
  if (range_type && typeof range_type === 'string') {
    if (!Object.values(REPORT_RANGE_TYPES).includes(range_type)) {
      next(new ApplicationError('Invalid range_type provided', 400));
      return;
    }
    normalizedRangeType = range_type;
  }

  let normalizedDate;
  if (date !== undefined) {
    if (typeof date !== 'string' || !isValidDateString(date.trim())) {
      next(new ApplicationError('date must be in YYYY-MM-DD format', 400));
      return;
    }
    normalizedDate = date.trim();
  }

  let normalizedFormat = REPORT_FORMATS.PDF;
  if (format && typeof format === 'string') {
    if (!Object.values(REPORT_FORMATS).includes(format)) {
      next(new ApplicationError('format must be either pdf or xlsx', 400));
      return;
    }
    normalizedFormat = format;
  }

  req.reportGenerationPayload = {
    machine_number: normalizedMachineNumber,
    admin_id: normalizedAdminId,
    range_type: normalizedRangeType,
    date: normalizedDate,
    format: normalizedFormat,
  };

  next();
};

export const validateReportListQuery = (req, _res, next) => {
  const { page, limit } = normalizePagination(req.query.page, req.query.limit);
  const { admin_id, machine_number, range_type, file_format, status } = req.query;

  let normalizedAdminId;
  if (admin_id !== undefined) {
    normalizedAdminId = normalizeId(admin_id);
    if (normalizedAdminId === null) {
      next(new ApplicationError('admin_id must be a valid positive integer', 400));
      return;
    }
  }

  let normalizedMachineNumber;
  if (machine_number !== undefined) {
    normalizedMachineNumber = normalizeId(machine_number);
    if (normalizedMachineNumber === null) {
      next(new ApplicationError('machine_number must be a valid positive integer', 400));
      return;
    }
  }

  if (range_type && !Object.values(REPORT_RANGE_TYPES).includes(range_type)) {
    next(new ApplicationError('Invalid range_type provided', 400));
    return;
  }

  if (file_format && !Object.values(REPORT_FORMATS).includes(file_format)) {
    next(new ApplicationError('Invalid file_format provided', 400));
    return;
  }

  if (status && !Object.values(REPORT_STATUSES).includes(status)) {
    next(new ApplicationError('Invalid status provided', 400));
    return;
  }

  req.reportListQuery = {
    page,
    limit,
    admin_id: normalizedAdminId,
    filters: {
      machine_number: normalizedMachineNumber,
      range_type,
      file_format,
      status,
    },
  };

  next();
};

