const router = require('express').Router();
const validation = require('../../lib/validation');
const { getReviewsByBusinessID } = require('../reviews');
const { getPhotosByBusinessID } = require('../photos');


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




/******************************************************
*				Business Queries
*******************************************************/
/*
  * Get the number of businesses in the DB
*/
function getBusinessesCount(mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT COUNT(*) AS count FROM businesses',
      function (err, results) {
        if (err) {
          reject(err);
        }
        else {
          resolve(results[0].count);
        }
      }
    );
  });
}
/*
  * Get a page businesses given the page number
  and how many records there are in the DB
*/
function getBusinessesPage(page, count, mysqlPool) {
  return new Promise((resolve, reject) => {
    const numPerPage = 10;
    const lastPage = Math.ceil(count / numPerPage);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;
    mysqlPool.query(
      'SELECT * FROM businesses ORDER BY id LIMIT ?,?',
      [ offset, numPerPage ],
      function (err, results) {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            businesses: results,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: count
          });
        }
      }
    );
  });
}
function postBusiness(businessInfo, mysqlPool) {
  return new Promise((resolve, reject) => {
    const businessValues = {
      id: null,
      ownerID: businessInfo.ownerID,
      name:  businessInfo.name,
      address:  businessInfo.address,
      city:  businessInfo.city,
      state:  businessInfo.state,
      zip:  businessInfo.zip,
      phone:  businessInfo.phone,
      category:  businessInfo.category,
      subcategory:  businessInfo.subcategory,
      website:  businessInfo.website,
      email:  businessInfo.email
    };
    mysqlPool.query(
      'INSERT INTO businesses SET ?',
      [ businessValues ],
      function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result.insertId);
        }
      }
    );
  });
}
function putBusiness(businessInfo, businessID, mysqlPool) {
  return new Promise((resolve, reject) => {
    const businessValues = {
      id: businessID,
      ownerID: businessInfo.ownerID,
      name:  businessInfo.name,
      address:  businessInfo.address,
      city:  businessInfo.city,
      state:  businessInfo.state,
      zip:  businessInfo.zip,
      phone:  businessInfo.phone,
      category:  businessInfo.category,
      subcategory:  businessInfo.subcategory,
      website:  businessInfo.website,
      email:  businessInfo.email
    };
    mysqlPool.query(
      'UPDATE businesses SET ? WHERE id = ?',
      [ businessValues, businessID ],
      function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}
function deleteBusiness(businessID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM businesses WHERE id = ?',
      [ businessID ],
      function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}
function getSpecificBusinessDetails(businessID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM businesses WHERE id = ?',
      [ businessID ],
      function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result[0]);
        }
      }
    );
  });
}
function getBusinessesByOwnerID(ownerID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM businesses WHERE ownerID=?',
      [ ownerID ],
      function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result);
        }
      }
    );
  });
}








/******************************************************
*				Business Routes
*******************************************************/
/*
 * Route to return a list of businesses.
 */
router.get('/', function(req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  getBusinessesCount(mysqlPool)
    .then((count) => {
      /* Compute page number based on optional query string parameter `page`. */
      return getBusinessesPage(parseInt(req.query.page) || 1, count, mysqlPool);
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
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, businessSchema)) {
    let business = validation.extractValidFields(req.body, businessSchema);
    postBusiness(business, mysqlPool)
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
  const mysqlPool = req.app.locals.mysqlPool;
  const businessID = parseInt(req.params.businessID);
  var returnValue = {};
  getSpecificBusinessDetails(businessID, mysqlPool)
    .then((BusinessInfo) => {
      if (BusinessInfo) {
        returnValue.business = BusinessInfo;
        return getReviewsByBusinessID(businessID, mysqlPool);
      } else {
        // No entry with this businessID in the DB, pass on to 404
        next();
      }

    })
    .then((businessReviews) => {
      returnValue.reviews = businessReviews;
      return getPhotosByBusinessID(businessID, mysqlPool);
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
  const mysqlPool = req.app.locals.mysqlPool;
  const businessID = parseInt(req.params.businessID);
  if (validation.validateAgainstSchema(req.body, businessSchema)) {
    let business = validation.extractValidFields(req.body, businessSchema);
    putBusiness(business, businessID, mysqlPool)
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
  const mysqlPool = req.app.locals.mysqlPool;
  const businessID = parseInt(req.params.businessID);
  deleteBusiness(businessID, mysqlPool)
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


exports.router = router;
exports.getBusinessesByOwnerID = getBusinessesByOwnerID;
