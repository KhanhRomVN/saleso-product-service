const { CategoryModel } = require("../models");
const { handleRequest, createError } = require("../services/responseHandler");

const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const CategoryController = {
  createNewCategoryBranch: (req, res) =>
    handleRequest(req, res, async (req) => {
      // image_uri, description are 2 optional value keys
      const { name, image_uri, description, parent_id, level } = req.body;
      if (!name || !parent_id || !level) {
        throw createError("Missing required fields", 400, "MISSING_FIELDS");
      }
      const slug = createSlug(name);
      const categoryData = {
        name,
        slug,
        image_uri,
        description,
        parent_id,
        level,
      };
      await CategoryModel.createNewCategoryBranch(categoryData);
      return { message: "Create category successful" };
    }),

  insertCategoryIntoHierarchy: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { name, image_uri, description, parent_id, level, children_id } =
        req.body;
      if (!name || !parent_id || !level || !children_id) {
        throw createError("Missing required fields", 400, "MISSING_FIELDS");
      }
      const slug = createSlug(name);
      const categoryData = {
        name,
        slug,
        image_uri,
        description,
        parent_id,
        level,
        children_id,
      };
      await CategoryModel.insertCategoryIntoHierarchy(categoryData);
      return { message: "Category inserted into hierarchy successfully" };
    }),

  updateCategory: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { category_id } = req.params;
      const { name, image_uri, description } = req.body;
      const categoryUpdate = { image_uri, description };
      if (name) {
        const slug = createSlug(name);
        categoryUpdate.name = name;
        categoryUpdate.slug = slug;
      }
      await CategoryModel.updateCategory(category_id, categoryUpdate);
      return { message: "Update category successful" };
    }),

  deleteCategory: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { category_id } = req.params;
      await CategoryModel.deleteCategory(category_id);
      return { message: "Delete category successful" };
    }),

  getAllCategoriesByLevel: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { level } = req.params;
      return await CategoryModel.getAllCategoriesByLevel(level);
    }),

  getAllCategoriesChildrenByParentId: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { parent_id } = req.params;
      return await CategoryModel.getAllCategoriesChildrenByParentId(parent_id);
    }),

  selectCategoriesArray: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { category_id } = req.params;
      return await CategoryModel.selectCategoriesArray(category_id);
    }),
};

module.exports = CategoryController;
