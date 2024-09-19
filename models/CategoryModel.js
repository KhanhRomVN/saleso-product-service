const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

const COLLECTION_NAME = "categories";
const CATEGORY_SCHEMA = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  image_uri: Joi.string().allow(""),
  description: Joi.string().allow(""),
  parent_id: Joi.string(),
  level: Joi.number().required(),
  created_at: Joi.date().default(Date.now),
  updated_at: Joi.date().default(Date.now),
}).options({ abortEarly: false });

const validateCategory = (categoryData) => {
  const { error } = CATEGORY_SCHEMA.validate(categoryData);
  if (error) {
    throw createError("Invalid category data", 400, "INVALID_CATEGORY_DATA");
  }
};

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

const CategoryModel = {
  createNewCategoryBranch: async (categoryData) => {
    return handleDBOperation(async (collection) => {
      validateCategory(categoryData);
      const result = await collection.insertOne(categoryData);
      return {
        message: "Category created successfully",
        categoryId: result.insertedId,
      };
    });
  },

  insertCategoryIntoHierarchy: async (categoryData) => {
    return handleDBOperation(async (collection) => {
      const {
        name,
        slug,
        image_uri,
        description,
        parent_id,
        children_id,
        level,
      } = categoryData;

      const newCategory = {
        name,
        slug,
        image_uri,
        description,
        parent_id,
        level,
      };
      const result = await collection.insertOne(newCategory);
      const newCategoryId = result.insertedId.toString();

      const childCategory = await collection.findOne({
        _id: new ObjectId(children_id),
      });
      if (!childCategory) {
        throw createError(
          "Child category not found",
          404,
          "CHILD_CATEGORY_NOT_FOUND"
        );
      }
      const levelDifference = level - childCategory.level + 1;

      await collection.updateOne(
        { _id: new ObjectId(children_id) },
        {
          $set: { parent_id: newCategoryId },
          $inc: { level: levelDifference },
        }
      );

      const updateDescendantLevels = async (parentId, levelIncrease) => {
        const children = await collection
          .find({ parent_id: parentId })
          .toArray();
        for (const child of children) {
          await collection.updateOne(
            { _id: child._id },
            { $inc: { level: levelIncrease } }
          );
          await updateDescendantLevels(child._id.toString(), levelIncrease);
        }
      };

      await updateDescendantLevels(children_id, levelDifference);

      return {
        message: "Category inserted into hierarchy successfully",
        newCategoryId,
      };
    });
  },

  updateCategory: async (categoryId, categoryUpdate) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(categoryId) },
        { $set: { ...categoryUpdate, updated_at: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw createError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }
      return { message: "Category updated successfully" };
    });
  },

  deleteCategory: async (categoryId) => {
    return handleDBOperation(async (collection) => {
      const category = await collection.findOne({
        _id: new ObjectId(categoryId),
      });
      if (!category) {
        throw createError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }

      if (category.parent_id) {
        await collection.updateOne(
          { _id: new ObjectId(category.parent_id) },
          { $pull: { children: categoryId } }
        );
      }

      await collection.updateMany(
        { parent_id: categoryId },
        { $set: { parent_id: category.parent_id } }
      );

      await collection.deleteOne({ _id: new ObjectId(categoryId) });

      const deleteDescendants = async (parentId) => {
        const children = await collection
          .find({ parent_id: parentId })
          .toArray();
        for (const child of children) {
          await deleteDescendants(child._id.toString());
          await collection.deleteOne({ _id: child._id });
        }
      };

      await deleteDescendants(categoryId);
      return { message: "Category and its descendants deleted successfully" };
    });
  },

  getAllCategoriesByLevel: async (level) => {
    return handleDBOperation(async (collection) => {
      return await collection.find({ level: parseInt(level) }).toArray();
    });
  },

  getAllCategoriesChildrenByParentId: async (parentId) => {
    return handleDBOperation(async (collection) => {
      return await collection.find({ parent_id: parentId }).toArray();
    });
  },

  selectCategoriesArray: async (categoryId) => {
    return handleDBOperation(async (collection) => {
      const result = [];
      let currentCategoryId = categoryId;

      while (currentCategoryId) {
        const category = await collection.findOne({
          _id: new ObjectId(currentCategoryId),
        });

        if (!category) {
          break;
        }

        result.push({
          category_id: currentCategoryId,
          category_name: category.name,
        });
        currentCategoryId = category.parent_id;
      }

      return result.reverse();
    });
  },
};

module.exports = CategoryModel;
