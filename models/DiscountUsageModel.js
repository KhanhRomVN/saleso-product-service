const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const { AppError } = require("../service/errorHandler");

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
    console.error(`Error in ${operation.name}: `, error);
    throw new AppError(error.message, 500);
  }
};

const DiscountUsageModel = {
  async newDiscountUsage(data) {
    return handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(data);
      if (error) {
        throw new AppError(
          error.details.map((detail) => detail.message).join(", "),
          400
        );
      }

      const result = await collection.insertOne({
        ...value,
        applied_at: new Date(value.applied_at),
      });

      if (!result.insertedId) {
        throw new AppError("Failed to insert discount usage", 500);
      }

      return { id: result.insertedId, ...value };
    });
  },

  async getDiscountUsage(discount_id, limit = 10) {
    return handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(discount_id)) {
        throw new AppError("Invalid discount_id", 400);
      }

      const usages = await collection
        .find({ discount_id: new ObjectId(discount_id) })
        .limit(limit)
        .toArray();

      return usages.map((usage) => ({
        ...usage,
        _id: usage._id.toString(),
      }));
    });
  },
};

module.exports = DiscountUsageModel;
