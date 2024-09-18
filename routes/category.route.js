const express = require("express");
const { CategoryController } = require("../controllers");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/create",
    handler: CategoryController.createNewCategoryBranch,
  },
  {
    method: "post",
    path: "/insert",
    handler: CategoryController.insertCategoryIntoHierarchy,
  },
  {
    method: "put",
    path: "/:category_id",
    handler: CategoryController.updateCategory,
  },
  {
    method: "delete",
    path: "/:category_id",
    handler: CategoryController.deleteCategory,
  },
  {
    method: "get",
    path: "/level/:level",
    handler: CategoryController.getAllCategoriesByLevel,
  },
  {
    method: "get",
    path: "/children-of-parent/:parent_id",
    handler: CategoryController.getAllCategoriesChildrenByParentId,
  },
  {
    method: "get",
    path: "/array-id/:category_id",
    handler: CategoryController.selectCategoriesArray,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
