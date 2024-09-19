const Joi = require("joi");
const { getDB } = require("../config/mongoDB");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

const COLLECTION_NAME = "product_logs";
const COLLECTION_SCHEMA = Joi.object({
  product_id: Joi.string().required(),
  title: Joi.string().required(),
  content: Joi.string(),
  created_at: Joi.date().default(Date.now),
}).options({ abortEarly: false });

const handleDBOperation = async (operation) => {
  const db = getDB();
  try {
    return await operation(db.collection(COLLECTION_NAME));
  } catch (error) {
    throw createError(
      `Database operation failed: ${error.message}`,
      500,
      "DB_OPERATION_FAILED"
    );
  }
};

const ProductLogModel = {
  createLog: async (logData) =>
    handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(logData);
      if (error) {
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "INVALID_LOG_DATA"
        );
      }

      const result = await collection.insertOne(value);
      return {
        message: "Product log created successfully",
        log: { id: result.insertedId, ...value },
      };
    }),

  getLogs: async (product_id, limit = 10) =>
    handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(product_id)) {
        throw createError("Invalid product_id", 400, "INVALID_PRODUCT_ID");
      }

      const logs = await collection
        .find({ product_id: new ObjectId(product_id) })
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();

      return {
        message: "Product logs retrieved successfully",
        logs,
        total: await collection.countDocuments({
          product_id: new ObjectId(product_id),
        }),
      };
    }),

  getLogById: async (log_id) =>
    handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(log_id)) {
        throw createError("Invalid log_id", 400, "INVALID_LOG_ID");
      }

      const log = await collection.findOne({ _id: new ObjectId(log_id) });
      if (!log) {
        throw createError("Log not found", 404, "LOG_NOT_FOUND");
      }

      return {
        message: "Product log retrieved successfully",
        log,
      };
    }),

  deleteLog: async (log_id) =>
    handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(log_id)) {
        throw createError("Invalid log_id", 400, "INVALID_LOG_ID");
      }

      const result = await collection.deleteOne({ _id: new ObjectId(log_id) });
      if (result.deletedCount === 0) {
        throw createError("Log not found", 404, "LOG_NOT_FOUND");
      }

      return { message: "Product log deleted successfully" };
    }),

  updateLog: async (log_id, updateData) =>
    handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(log_id)) {
        throw createError("Invalid log_id", 400, "INVALID_LOG_ID");
      }

      const { error, value } = Joi.object({
        title: Joi.string(),
        content: Joi.string(),
      }).validate(updateData);

      if (error) {
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "INVALID_UPDATE_DATA"
        );
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(log_id) },
        { $set: { ...value, updated_at: new Date() } }
      );

      if (result.matchedCount === 0) {
        throw createError("Log not found", 404, "LOG_NOT_FOUND");
      }

      return { message: "Product log updated successfully" };
    }),
};

module.exports = ProductLogModel;
