const Joi = require("joi");
const { getDB } = require("../config/mongoDB");
const { ObjectId } = require("mongodb");

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
    console.error(`Error in ${operation.name}: `, error);
    throw error;
  }
};

const ProductLogModel = {
  createLog: async (logData) =>
    handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(logData);
      if (error) {
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );
      }

      const result = await collection.insertOne(value);
      return { id: result.insertedId, ...value };
    }),

  getLogs: async (product_id, limit = 10) =>
    handleDBOperation(async (collection) => {
      if (!ObjectId.isValid(product_id)) {
        throw new Error("Invalid product_id");
      }

      return await collection
        .find({ product_id: new ObjectId(product_id) })
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
    }),
};

module.exports = ProductLogModel;
