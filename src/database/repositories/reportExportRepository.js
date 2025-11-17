import ReportExportModel from '../models/reportExport.js';
import { defaultLeanOption, normalizeId } from '../../helper/index.js';

const sanitizeFilters = (filters = {}) => {
  const sanitized = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
};

export const createReportExport = async (payload) => {
  const document = await ReportExportModel.create(payload);
  return document.toJSON();
};

export const updateReportExportById = async (reportId, updates, options = {}) => {
  const normalizedId = normalizeId(reportId);
  if (normalizedId === null) {
    return null;
  }

  const query = ReportExportModel.findOneAndUpdate(
    { id: normalizedId },
    { $set: updates },
    { new: true }
  );

  if (defaultLeanOption(options)) {
    query.lean();
  }

  return query.exec();
};

export const findReportExportById = async (reportId, options = {}) => {
  const normalizedId = normalizeId(reportId);
  if (normalizedId === null) {
    return null;
  }

  const query = ReportExportModel.findOne({ id: normalizedId });

  if (defaultLeanOption(options)) {
    query.lean();
  }

  return query.exec();
};

export const findReportExports = async ({
  filters = {},
  page = 1,
  limit = 10,
  sort = { created_at: -1 },
  options = {},
} = {}) => {
  const sanitizedFilters = sanitizeFilters(filters);
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const normalizedLimit = limit === 'all' ? 'all' : Number.isFinite(limit) && limit > 0 ? limit : 10;

  const baseQuery = ReportExportModel.find(sanitizedFilters).sort(sort);

  if (defaultLeanOption(options) ?? true) {
    baseQuery.lean();
  }

  const query =
    normalizedLimit === 'all'
      ? baseQuery
      : baseQuery.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit);

  const [data, total] = await Promise.all([
    query.exec(),
    ReportExportModel.countDocuments(sanitizedFilters).exec(),
  ]);

  return {
    data,
    total,
    page: normalizedPage,
    limit: normalizedLimit,
  };
};
import ReportExportModel from '../models/reportExport.js';
import { defaultLeanOption, normalizeId } from '../../helper/index.js';

const sanitizeFilters = (filters = {}) => {
  const sanitized = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
};

export const createReportExport = async (payload) => {
  const document = await ReportExportModel.create(payload);
  return document.toJSON();
};

export const updateReportExportById = async (reportId, updates, options = {}) => {
  const normalizedId = normalizeId(reportId);
  if (normalizedId === null) {
    return null;
  }

  const query = ReportExportModel.findOneAndUpdate(
    { id: normalizedId },
    { $set: updates },
    { new: true }
  );

  if (defaultLeanOption(options)) {
    query.lean();
  }

  return query.exec();
};

export const findReportExportById = async (reportId, options = {}) => {
  const normalizedId = normalizeId(reportId);
  if (normalizedId === null) {
    return null;
  }

  const query = ReportExportModel.findOne({ id: normalizedId });

  if (defaultLeanOption(options)) {
    query.lean();
  }

  return query.exec();
};

export const findReportExports = async ({ filters = {}, page = 1, limit = 10, sort = { created_at: -1 }, options = {} } = {}) => {
  const sanitizedFilters = sanitizeFilters(filters);
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const normalizedLimit = limit === 'all' ? 'all' : Number.isFinite(limit) && limit > 0 ? limit : 10;

  const baseQuery = ReportExportModel.find(sanitizedFilters).sort(sort);

  if (defaultLeanOption(options) ?? true) {
    baseQuery.lean();
  }

  const query = normalizedLimit === 'all' ? baseQuery : baseQuery.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit);

  const [data, total] = await Promise.all([query.exec(), ReportExportModel.countDocuments(sanitizedFilters).exec()]);

  return {
    data,
    total,
    page: normalizedPage,
    limit: normalizedLimit,
  };
};

