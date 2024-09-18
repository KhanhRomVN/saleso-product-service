const { getDB } = require("../config/mongoDB");

const Joi = require("joi");
const { ObjectId } = require("mongodb");

const { AppError } = require("../service/errorHandler");

const COLLECTION_NAME = "discounts";

const COLLECTION_SCHEMA = Joi.object({
  seller_id: Joi.string().required(),
  code: Joi.string().required(),
  type: Joi.string()
    .valid("percentage", "flash-sale", "first-time", "free-shipping")
    .required(),
  value: Joi.number().min(0).max(100).required(),
  minimum_purchase: Joi.number().required(),
  max_uses: Joi.number().required(),
  current_uses: Joi.number().required(),
  customer_usage_limit: Joi.number().default(1).min(1).required(),
  applicable_products: Joi.array().items(Joi.string()),
  status: Joi.string().valid("upcoming", "ongoing", "expired").required(),
  is_active: Joi.boolean().default(true),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
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

const validateDiscount = (discountData) => {
  const { error } = COLLECTION_SCHEMA.validate(discountData);
  if (error)
    throw new AppError(error.details.map((d) => d.message).join(", "), 400);

  if (discountData.type === "flash-sale") {
    validateFlashSaleDiscount(discountData.start_date, discountData.end_date);
  }
};

const validateFlashSaleDiscount = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    start.getMinutes() !== 0 ||
    start.getSeconds() !== 0 ||
    end.getMinutes() !== 0 ||
    end.getSeconds() !== 0
  ) {
    throw new AppError(
      "Flash-sale start and end times must be on the hour",
      400
    );
  }

  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours < 1 || durationHours > 10) {
    throw new AppError(
      "Flash-sale duration must be between 1 and 10 hours",
      400
    );
  }
};

const DiscountModel = {
  async createDiscount(discountData) {
    validateDiscount(discountData);
    if (discountData.type === "flash-sale") {
      const now = new Date();
      const startDate = new Date(discountData.start_date);
      if (startDate <= now) {
        throw new AppError("Flash-sale start time must be in the future", 400);
      }
    }
    return handleDBOperation(async (collection) => {
      const result = await collection.insertOne(discountData);
      return result.insertedId;
    });
  },

  async getDiscountsBySellerId(seller_id) {
    return handleDBOperation((collection) =>
      collection.find({ seller_id }).toArray()
    );
  },

  async getDiscountById(discount_id) {
    return handleDBOperation((collection) =>
      collection.findOne({ _id: new ObjectId(discount_id) })
    );
  },

  async getDiscountsByIds(discount_ids) {
    return handleDBOperation(async (collection) => {
      const objectIds = discount_ids.map((id) => new ObjectId(id));
      return await collection.find({ _id: { $in: objectIds } }).toArray();
    });
  },

  async toggleDiscountStatus(id) {
    return handleDBOperation(async (collection) => {
      const discount = await collection.findOne({ _id: new ObjectId(id) });
      if (!discount) return null;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { is_active: !discount.is_active } },
        { returnDocument: "after" }
      );
      return result.value;
    });
  },

  async updateDiscountStatuses() {
    return handleDBOperation(async (collection) => {
      const currentDate = new Date();

      await collection.bulkWrite([
        {
          updateMany: {
            filter: {
              status: "upcoming",
              start_date: { $lte: currentDate },
              end_date: { $gt: currentDate },
            },
            update: { $set: { status: "ongoing" } },
          },
        },
        {
          updateMany: {
            filter: {
              status: { $in: ["upcoming", "ongoing"] },
              end_date: { $lte: currentDate },
            },
            update: { $set: { status: "expired" } },
          },
        },
      ]);
    });
  },

  applyDiscount: async (discount_id, product_id) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(discount_id) },
        {
          $addToSet: { applicable_products: product_id },
          $set: { updated_at: new Date() },
        }
      );

      if (result.matchedCount === 0) {
        throw new Error("Discount not found");
      }

      if (result.modifiedCount === 0) {
        console.log("Product was already in the applicable_products array");
      }

      return result;
    });
  },

  removeDiscount: async (discount_id, product_id) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(discount_id) },
        {
          $pull: { applicable_products: product_id },
          $set: { updated_at: new Date() },
        }
      );

      if (result.matchedCount === 0) {
        throw new Error("Discount not found");
      }

      if (result.modifiedCount === 0) {
        console.log("Product was not in the applicable_products array");
      }

      return result;
    });
  },

  deleteDiscount: async (id) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    });
  },
};

module.exports = DiscountModel;
