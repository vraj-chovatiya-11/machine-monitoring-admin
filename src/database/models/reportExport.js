import mongoose from 'mongoose';

import { REPORT_FORMATS, REPORT_RANGE_TYPES, REPORT_STATUSES, REPORT_TYPES } from '../../constants/report.js';
import collections from '../config/collections.js';
import sequentialIdPlugin from '../plugins/sequentialIdPlugin.js';

const { Schema, model, models } = mongoose;

const reportExportSchema = new Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
    },
    admin_id: {
      type: Number,
      required: true,
      index: true,
    },
    factory_id: {
      type: Number,
      required: true,
      index: true,
    },
    machine_number: {
      type: Number,
      required: true,
      index: true,
    },
    report_type: {
      type: String,
      required: true,
      enum: Object.values(REPORT_TYPES),
      default: REPORT_TYPES.MACHINE_PERFORMANCE,
    },
    range_type: {
      type: String,
      required: true,
      enum: Object.values(REPORT_RANGE_TYPES),
      default: REPORT_RANGE_TYPES.DAILY,
    },
    start_date: {
      type: String,
      required: true,
    },
    end_date: {
      type: String,
      required: true,
    },
    file_format: {
      type: String,
      required: true,
      enum: Object.values(REPORT_FORMATS),
      default: REPORT_FORMATS.PDF,
    },
    file_name: {
      type: String,
      default: null,
    },
    file_path: {
      type: String,
      default: null,
    },
    file_size: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUSES),
      default: REPORT_STATUSES.PROCESSING,
      index: true,
    },
    requested_by: {
      type: Number,
      required: true,
    },
    rollup_summary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  {
    collection: collections.REPORT_EXPORT,
    versionKey: false,
    strict: true,
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

reportExportSchema.plugin(sequentialIdPlugin, {
  fieldName: 'id',
  counterKey: 'report_export_id',
});

reportExportSchema.index({ admin_id: 1, factory_id: 1, machine_number: 1, created_at: -1 });
reportExportSchema.index({ range_type: 1, file_format: 1, status: 1 });

reportExportSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    // eslint-disable-next-line no-underscore-dangle
    delete ret._id;
    return ret;
  },
});

const ReportExportModel =
  models.ReportExport ?? model('ReportExport', reportExportSchema, collections.REPORT_EXPORT);

export default ReportExportModel;
import mongoose from 'mongoose';

import { REPORT_FORMATS, REPORT_RANGE_TYPES, REPORT_STATUSES, REPORT_TYPES } from '../../constants/report.js';
import collections from '../config/collections.js';
import sequentialIdPlugin from '../plugins/sequentialIdPlugin.js';

const { Schema, model, models } = mongoose;

const reportExportSchema = new Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
    },
    admin_id: {
      type: Number,
      required: true,
      index: true,
    },
    factory_id: {
      type: Number,
      required: true,
      index: true,
    },
    machine_number: {
      type: Number,
      required: true,
      index: true,
    },
    report_type: {
      type: String,
      required: true,
      enum: Object.values(REPORT_TYPES),
      default: REPORT_TYPES.MACHINE_PERFORMANCE,
    },
    range_type: {
      type: String,
      required: true,
      enum: Object.values(REPORT_RANGE_TYPES),
      default: REPORT_RANGE_TYPES.DAILY,
    },
    start_date: {
      type: String,
      required: true,
    },
    end_date: {
      type: String,
      required: true,
    },
    file_format: {
      type: String,
      required: true,
      enum: Object.values(REPORT_FORMATS),
      default: REPORT_FORMATS.PDF,
    },
    file_name: {
      type: String,
      default: null,
    },
    file_path: {
      type: String,
      default: null,
    },
    file_size: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUSES),
      default: REPORT_STATUSES.PROCESSING,
      index: true,
    },
    requested_by: {
      type: Number,
      required: true,
    },
    rollup_summary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  {
    collection: collections.REPORT_EXPORT,
    versionKey: false,
    strict: true,
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

reportExportSchema.plugin(sequentialIdPlugin, {
  fieldName: 'id',
  counterKey: 'report_export_id',
});

reportExportSchema.index({ admin_id: 1, factory_id: 1, machine_number: 1, created_at: -1 });
reportExportSchema.index({ range_type: 1, file_format: 1, status: 1 });

reportExportSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    // eslint-disable-next-line no-underscore-dangle
    delete ret._id;
    return ret;
  },
});

const ReportExportModel =
  models.ReportExport ?? model('ReportExport', reportExportSchema, collections.REPORT_EXPORT);

export default ReportExportModel;

