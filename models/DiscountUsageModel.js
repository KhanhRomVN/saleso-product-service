const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

const COLLECTION_NAME = "discount_usage";
const COLLECTION_SCHEMA = Joi.object({
  customer_id: Joi.string().required(),
  discount_id: Joi.string().required(),
  order_id: Joi.string().required(),
  discount_cost: Joi.number().required(),
  applied_at: Joi.date().required(),
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

const DiscountUsageModel = {
  async newDiscountUsage(data) {
    return handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(data);
      if (error) {
        throw createError(
          error.details.map((detail) => detail.message).join(", "),
          400,
          "INVALID_DISCOUNT_USAGE_DATA"
        );
      }

      const result = await collection.insertOne({
        ...value,
        applied_at: new Date(value.applied_at),
      });

      if (!result.insertedId) {
        throw createError(
          "Failed to insert discount usage",
          500,
          "INSERT_FAILED"
        );
      }

      return {
        message: "Discount usage created successfully",
        discountUsage: { id: result.insertedId, ...value },
      };
    });
  },

  async getDiscountUsage(discount_id, limit = 10) {
    return handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(discount_id)) {
        throw createError("Invalid discount_id", 400, "INVALID_DISCOUNT_ID");
      }

      const usages = await collection
        .find({ discount_id: new ObjectId(discount_id) })
        .limit(limit)
        .toArray();

      return {
        message: "Discount usages retrieved successfully",
        usages: usages.map((usage) => ({
          ...usage,
          _id: usage._id.toString(),
        })),
      };
    });
  },

  async getDiscountUsageByCustomer(customer_id, discount_id) {
    return handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(discount_id)) {
        throw createError("Invalid discount_id", 400, "INVALID_DISCOUNT_ID");
      }

      const usage = await collection.findOne({
        customer_id,
        discount_id: new ObjectId(discount_id),
      });

      if (!usage) {
        return {
          message: "No discount usage found for this customer and discount",
        };
      }

      return {
        message: "Discount usage retrieved successfully",
        usage: {
          ...usage,
          _id: usage._id.toString(),
        },
      };
    });
  },

  async deleteDiscountUsage(usage_id) {
    return handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(usage_id)) {
        throw createError("Invalid usage_id", 400, "INVALID_USAGE_ID");
      }

      const result = await collection.deleteOne({
        _id: new ObjectId(usage_id),
      });

      if (result.deletedCount === 0) {
        throw createError(
          "Discount usage not found",
          404,
          "DISCOUNT_USAGE_NOT_FOUND"
        );
      }

      return { message: "Discount usage deleted successfully" };
    });
  },
};

module.exports = DiscountUsageModel;
