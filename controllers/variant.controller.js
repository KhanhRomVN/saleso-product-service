const { VariantModel } = require("../models");
const { handleRequest, createError } = require("../services/responseHandler");

const VariantController = {
  newVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const variantData = req.body;
      if (!variantData || Object.keys(variantData).length === 0) {
        throw createError(
          "Variant data is required",
          400,
          "MISSING_VARIANT_DATA"
        );
      }
      const result = await VariantModel.newVariant(variantData);
      return { message: "Variant created successfully", variant: result };
    }),

  bulkCreateVariants: (req, res) =>
    handleRequest(req, res, async (req) => {
      const variantsData = req.body;
      if (!Array.isArray(variantsData) || variantsData.length === 0) {
        throw createError(
          "Invalid variants data",
          400,
          "INVALID_VARIANTS_DATA"
        );
      }
      const result = await VariantModel.bulkCreateVariants(variantsData);
      return { message: "Variants created successfully", count: result.length };
    }),

  getVariantBySku: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      if (!sku) {
        throw createError("SKU is required", 400, "MISSING_SKU");
      }
      const variant = await VariantModel.getVariantBySku(sku);
      if (!variant) {
        throw createError("Variant not found", 404, "VARIANT_NOT_FOUND");
      }
      return variant;
    }),

  getVariantByCategory: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { category_id } = req.params;
      if (!category_id) {
        throw createError(
          "Category ID is required",
          400,
          "MISSING_CATEGORY_ID"
        );
      }
      const variants = await VariantModel.getVariantByCategory(category_id);

      const variantsWithoutCategories = variants.map(
        ({ categories, ...rest }) => rest
      );

      const groupedVariants = variantsWithoutCategories.reduce(
        (acc, variant) => {
          if (!acc[variant.group]) {
            acc[variant.group] = [];
          }
          acc[variant.group].push(variant);
          return acc;
        },
        {}
      );

      return Object.values(groupedVariants);
    }),

  getVariantByGroup: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { group } = req.params;
      if (!group) {
        throw createError("Group is required", 400, "MISSING_GROUP");
      }
      const variants = await VariantModel.getVariantByGroup(group);
      if (variants.length === 0) {
        throw createError(
          "No variants found for this group",
          404,
          "NO_VARIANTS_FOUND"
        );
      }
      return variants;
    }),

  updateVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      const updateData = req.body;
      if (!sku) {
        throw createError("SKU is required", 400, "MISSING_SKU");
      }
      if (!updateData || Object.keys(updateData).length === 0) {
        throw createError(
          "Update data is required",
          400,
          "MISSING_UPDATE_DATA"
        );
      }
      const result = await VariantModel.updateVariant(sku, updateData);
      if (!result) {
        throw createError(
          "Variant not found or update failed",
          404,
          "UPDATE_FAILED"
        );
      }
      return { message: "Variant updated successfully", variant: result };
    }),

  deleteGroup: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { group } = req.params;
      if (!group) {
        throw createError("Group is required", 400, "MISSING_GROUP");
      }
      const result = await VariantModel.deleteGroup(group);
      if (result.deletedCount === 0) {
        throw createError(
          "No variants found for this group",
          404,
          "NO_VARIANTS_FOUND"
        );
      }
      return {
        message: "Group deleted successfully",
        deletedCount: result.deletedCount,
      };
    }),

  deleteVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      if (!sku) {
        throw createError("SKU is required", 400, "MISSING_SKU");
      }
      const result = await VariantModel.deleteVariant(sku);
      if (!result) {
        throw createError("Variant not found", 404, "VARIANT_NOT_FOUND");
      }
      return { message: "Variant deleted successfully" };
    }),
};

module.exports = VariantController;
