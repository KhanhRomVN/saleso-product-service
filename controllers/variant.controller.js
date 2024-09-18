const logger = require("../config/logger");
const { VariantModel } = require("../models");

const handleRequest = async (req, res, operation) => {
  try {
    const result = await operation(req);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in ${operation.name}: ${error}`);
    res
      .status(error.status || 500)
      .json({ error: error.message || "Internal Server Error" });
  }
};

const VariantController = {
  newVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const variantData = req.body;
      return await VariantModel.newVariant(variantData);
    }),

  bulkCreateVariants: (req, res) =>
    handleRequest(req, res, async (req) => {
      const variantsData = req.body;
      return await VariantModel.bulkCreateVariants(variantsData);
    }),

  getVariantBySku: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      return await VariantModel.getVariantBySku(sku);
    }),

  getVariantByCategory: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { category_id } = req.params;
      const variants = await VariantModel.getVariantByCategory(category_id);

      // Step 1: Remove categories array from each object
      const variantsWithoutCategories = variants.map(
        ({ categories, ...rest }) => rest
      );

      // Step 2: Group variants by their "group" property
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

      // Convert the grouped object to an array of arrays
      return Object.values(groupedVariants);
    }),

  getVariantByGroup: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { group } = req.params;
      return await VariantModel.getVariantByGroup(group);
    }),

  updateVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      const updateData = req.body;
      return await VariantModel.updateVariant(sku, updateData);
    }),

  deleteGroup: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { group } = req.params;
      return await VariantModel.deleteGroup(group);
    }),

  deleteVariant: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { sku } = req.params;
      return await VariantModel.deleteVariant(sku);
    }),
};

module.exports = VariantController;
