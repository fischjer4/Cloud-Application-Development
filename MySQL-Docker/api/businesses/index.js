const router = require('express').Router();
const validation = require('../../lib/validation');
const mysqldb = require('../../MySQL/mysql');

exports.router = router;

/*
 * Schema describing required/optional fields of a business object.
 */
const businessSchema = {
  ownerID: {required: true},
  name: {required: true},
  address: {required: true},
  city: {required: true},
  state: {required: true},
  zip: {required: true},
  phone: {required: true},
  category: {required: true},
  subcategory: {required: true},
  website: {required: false},
  email: {required: false}
};


/*
 * Route to return a list of businesses.
 */
router.get('/', function(req, res) {
  mysqldb.getBusinessesCount()
    .then((count) => {
      /* Compute page number based on optional query string parameter `page`. */
      return mysqldb.getBusinessesPage(parseInt(req.query.page) || 1, count);
    })
    .then((BusinessesInfo) => {
      /* Generate HATEOAS links for surrounding pages.*/
      BusinessesInfo.links = {};
      let {
        links,
        lastPage,
        pageNumber
      } = BusinessesInfo;
      if (pageNumber < lastPage) {
        links.nextPage = '/Businesses?page=' + (pageNumber + 1);
        links.lastPage = '/Businesses?page=' + lastPage;
      }
      if (pageNumber > 1) {
        links.prevPage = '/Businesses?page=' + (pageNumber - 1);
        links.firstPage = '/Businesses?page=1';
      }
      res.status(200).json(BusinessesInfo);
    })
    .catch((err) => {
      res.status(500).json({
        error: `Unable to get the businesses from the database`
      });
    });
});


/*
 * Route to create a new business.
 */
router.post('/', function(req, res, next) {
  if (validation.validateAgainstSchema(req.body, businessSchema)) {
    let business = validation.extractValidFields(req.body, businessSchema);
    mysqldb.postBusiness(business)
      .then((insertId) => {
        res.status(201).json({
          id: insertId,
          /* Generate HATEOAS links for surrounding pages.*/
          links: {
            business: `/businesses/${insertId}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to insert the business into the database`
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid business object"
    });
  }
});

/*
 * Route to fetch info about a specific business.
 */
router.get('/:businessID', function(req, res, next) {
  const businessID = parseInt(req.params.businessID);
  var returnValue = {};
  mysqldb.getSpecificBusinessDetails(businessID)
    .then((BusinessInfo) => {
      if (BusinessInfo) {
        returnValue.business = BusinessInfo;
        return mysqldb.getReviewsByBusinessID(businessID);
      } else {
        // No entry with this businessID in the DB, pass on to 404
        next();
      }

    })
    .then((businessReviews) => {
      returnValue.reviews = businessReviews;
      return mysqldb.getPhotosByBusinessID(businessID);
    })
    .then((businessPhotos) => {
      returnValue.photos = businessPhotos;
      res.status(200).json(returnValue);
    })
    .catch((err) => {
      res.status(500).json({
        error: `Unable to fetch business details for user ${businessID}`
      });
    });

});
/*
 * Route to replace data for a business.
 */
router.put('/:businessID', function(req, res, next) {
  const businessID = parseInt(req.params.businessID);
  if (validation.validateAgainstSchema(req.body, businessSchema)) {
    let business = validation.extractValidFields(req.body, businessSchema);
    mysqldb.putBusiness(business, businessID)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            /* Generate HATEOAS links for surrounding pages.*/
            links: {
              business: `/businesses/${businessID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to update the business with ID: ${businessID}`
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid business object"
    });
  }
});

/*
 * Route to delete a business.
 */
router.delete('/:businessID', function(req, res, next) {
  const businessID = parseInt(req.params.businessID);
  mysqldb.deleteBusiness(businessID)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).send();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: `Unable to delete the business with ID: ${businessID}`
      });
    });
});
