const router = require('express').Router();
const validation = require('../../lib/validation');

let categories = require('./categories');

exports.router = router;
exports.categories = categories;

/*
 * Schema describing required/optional fields of a category object.
 */
const categorySchema = {
  category: { required: true }
};


/*
 * Schema describing required/optional fields of a subcategory object.
 */
const subcategorySchema = {
  subcategory: { required: true }
};


router.get('/', function (req, res) {
  let categoryNames = categories.map(category => category.category);
  res.status(200).json({
    categories: categoryNames
  });
});

/*
 * Route to create a new photo.
 */
router.post('/', function (req, res, next) {
  if (validation.validateAgainstSchema(req.body, categorySchema)) {
    /*
     * Make sure category doesn't already exist.
     */
    let newCategory = validation.extractValidFields(req.body, categorySchema);
    if (categories.some(category => category.category === newCategory.category)) {
      res.status(403).json({
        error: "Specified category already exists"
      });
    } else {
      newCategory.subcategories = [];
      categories.push(newCategory)
      res.status(201).json({
        links: {
          category: `/categories/${newCategory.category}`,
        }
      });
    }
  } else {
    res.status(400).json({
      error: "Request body is not a valid category object"
    });
  }
});


/*
 * Route to fetch info about a specific category.
 */
router.get('/:category', function (req, res, next) {
  const categoryName = req.params.category;
  let foundCategory = categories.find(category => category.category === categoryName);
  if (foundCategory) {
    res.status(200).json(foundCategory);
  } else {
    next();
  }
});


/*
 * Route to add a subcategory to a categpry.
 */
router.post('/:category', function (req, res, next) {
  const categoryName = req.params.category;
  let foundCategory = categories.find(category => category.category === categoryName);
  if (foundCategory) {

    if (validation.validateAgainstSchema(req.body, subcategorySchema)) {
      /*
       * Make sure subcategory doesn't already exist for category.
       */
      let newSubcategory = validation.extractValidFields(req.body, subcategorySchema);
      if (foundCategory.subcategories.some(subcategory => subcategory === newSubcategory.subcategory)) {
        res.status(403).json({
          error: `Subcategory '${newSubcategory.subcategory}' already exists for category '${categoryName}'`
        });
      } else {
        foundCategory.subcategories.push(newSubcategory.subcategory);
        res.status(201).json({
          category: `/categories/${categoryName}`
        });
      }
    }

  } else {
    next();
  }
});

/*
 * Route to delete a category.
 */
router.delete('/:category', function( req, res, next) {
  const categoryName = req.params.category;
  let categoryIdx = categories.findIndex(category => category.category === categoryName);
  if (categoryIdx >= 0) {
    /*
     * If category exists, remove it from the array of categories.
     */
    categories.splice(categoryIdx, 1);
    res.status(204).end();
  } else {
    next();
  }
});

/*
 * Route to delete a subcategory.
 */
router.delete('/:category/:subcategory', function( req, res, next) {
  const categoryName = req.params.category;
  const subcategoryName = req.params.subcategory;
  let foundCategory = categories.find(category => category.category === categoryName);
  if (foundCategory) {
    /*
     * If subcategory exists for this category, remove it.
     */
    let subcategoryIdx = foundCategory.subcategories.findIndex(subcategory => subcategory === subcategoryName);
    if (subcategoryIdx >= 0) {
      foundCategory.subcategories.splice(subcategoryIdx, 1);
      res.status(204).end();
    } else {
      next();
    }
  } else {
    next();
  }
});
