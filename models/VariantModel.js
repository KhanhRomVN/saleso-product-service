const Joi = require("joi");
const { getDB } = require("../config/mongoDB");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "variants";
const COLLECTION_SCHEMA = Joi.object({
  sku: Joi.string().required(),
  group: Joi.string().required(),
  categories: Joi.array().items(Joi.string()).required(),
  variant: Joi.string().required(),
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

const VariantModel = {
  newVariant: async (variantData) =>
    handleDBOperation(async (collection) => {
      const { error } = COLLECTION_SCHEMA.validate(variantData);
      if (error)
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );

      await collection.insertOne(variantData);
    }),

  bulkCreateVariants: async (variantsData) =>
    handleDBOperation(async (collection) => {
      const validatedData = variantsData.map((variant) => {
        const { error } = COLLECTION_SCHEMA.validate(variant);
        if (error) {
          throw new Error(
            `Validation error for SKU ${variant.sku}: ${error.details.map((d) => d.message).join(", ")}`
          );
        }
        return variant;
      });

      const result = await collection.insertMany(validatedData);
      return result.insertedCount;
    }),

  getVariantBySku: async (sku) =>
    handleDBOperation(async (collection) => {
      return await collection.findOne({ sku: sku });
    }),

  getVariantByCategory: async (category_id) =>
    handleDBOperation(async (collection) => {
      return await collection
        .find({ categories: { $in: [category_id] } })
        .toArray();
    }),

  getVariantByGroup: async (group) =>
    handleDBOperation(async (collection) => {
      return await collection.find({ group: group }).toArray();
    }),

  updateVariant: async (sku, updateData) =>
    handleDBOperation(async (collection) => {
      const { error } = COLLECTION_SCHEMA.validate(updateData, {
        allowUnknown: true,
      });
      if (error)
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );

      const result = await collection.updateOne(
        { sku: sku },
        { $set: updateData }
      );
      return result.modifiedCount;
    }),

  deleteGroup: async (group) =>
    handleDBOperation(async (collection) => {
      const result = await collection.deleteMany({ group: group });
      return result.deletedCount;
    }),

  deleteVariant: async (sku) =>
    handleDBOperation(async (collection) => {
      const result = await collection.deleteOne({ sku: sku });
      return result.deletedCount;
    }),
};

module.exports = VariantModel;
