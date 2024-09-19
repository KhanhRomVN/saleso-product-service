const Joi = require("joi");
const { getDB } = require("../config/mongoDB");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

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
    throw createError(error.message, 500, "DB_OPERATION_ERROR");
  }
};

const VariantModel = {
  newVariant: async (variantData) =>
    handleDBOperation(async (collection) => {
      const { error } = COLLECTION_SCHEMA.validate(variantData);
      if (error)
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );

      await collection.insertOne(variantData);
    }),

  bulkCreateVariants: async (variantsData) =>
    handleDBOperation(async (collection) => {
      const validatedData = variantsData.map((variant) => {
        const { error } = COLLECTION_SCHEMA.validate(variant);
        if (error) {
          throw createError(
            `Validation error for SKU ${variant.sku}: ${error.details.map((d) => d.message).join(", ")}`,
            400,
            "VALIDATION_ERROR"
          );
        }
        return variant;
      });

      const result = await collection.insertMany(validatedData);
      return result.insertedCount;
    }),

  getVariantBySku: async (sku) =>
    handleDBOperation(async (collection) => {
      const variant = await collection.findOne({ sku: sku });
      if (!variant)
        throw createError("Variant not found", 404, "VARIANT_NOT_FOUND");
      return variant;
    }),

  getVariantByCategory: async (category_id) =>
    handleDBOperation(async (collection) => {
      const variants = await collection
        .find({ categories: { $in: [category_id] } })
        .toArray();
      if (variants.length === 0)
        throw createError(
          "No variants found for this category",
          404,
          "NO_VARIANTS_FOUND"
        );
      return variants;
    }),

  getVariantByGroup: async (group) =>
    handleDBOperation(async (collection) => {
      const variants = await collection.find({ group: group }).toArray();
      if (variants.length === 0)
        throw createError(
          "No variants found for this group",
          404,
          "NO_VARIANTS_FOUND"
        );
      return variants;
    }),

  updateVariant: async (sku, updateData) =>
    handleDBOperation(async (collection) => {
      const { error } = COLLECTION_SCHEMA.validate(updateData, {
        allowUnknown: true,
      });
      if (error)
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );

      const result = await collection.updateOne(
        { sku: sku },
        { $set: updateData }
      );
      if (result.matchedCount === 0)
        throw createError("Variant not found", 404, "VARIANT_NOT_FOUND");
      return result.modifiedCount;
    }),

  deleteGroup: async (group) =>
    handleDBOperation(async (collection) => {
      const result = await collection.deleteMany({ group: group });
      if (result.deletedCount === 0)
        throw createError(
          "No variants found for this group",
          404,
          "NO_VARIANTS_FOUND"
        );
      return result.deletedCount;
    }),

  deleteVariant: async (sku) =>
    handleDBOperation(async (collection) => {
      const result = await collection.deleteOne({ sku: sku });
      if (result.deletedCount === 0)
        throw createError("Variant not found", 404, "VARIANT_NOT_FOUND");
      return result.deletedCount;
    }),
};

module.exports = VariantModel;
