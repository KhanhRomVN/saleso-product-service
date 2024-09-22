const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

const COLLECTION_NAME = "discount_usage";
const COLLECTION_SCHEMA = Joi.object({
  customer_id: Joi.string().required(),
  discount_id: Joi.string().required(),
  product_id: Joi.string().required(),
  discount_cost: Joi.number().required(),
  year: Joi.number().required(),
  month: Joi.number().required(),
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
  async newDiscountUsage(customer_id, discount_id, product_id, discount_cost) {
    return handleDBOperation(async (collection) => {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const discountUsage = {
        customer_id,
        discount_id,
        product_id,
        discount_cost,
        year,
        month,
        applied_at: currentDate,
      };

      const { error, value } = COLLECTION_SCHEMA.validate(discountUsage);
      if (error) {
        throw createError(
          error.details.map((detail) => detail.message).join(", "),
          400,
          "INVALID_DISCOUNT_USAGE_DATA"
        );
      }

      await collection.insertOne(value);
    });
  },

  async getDiscountUsageByDiscountId(discount_id) {
    return handleDBOperation(async (collection) => {
      const discountUsage = await collection.find({ discount_id }).toArray();
      return discountUsage;
    });
  },
};

module.exports = DiscountUsageModel;
