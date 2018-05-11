const router = require('express').Router();
const validation = require('../../lib/validation');
const mysqldb = require('../../MySQL/mysql');

let reviews = require('./reviews');

exports.router = router;
exports.reviews = reviews;

/*
 * Schema describing required/optional fields of a review object.
 */
const reviewSchema = {
  userID: { required: true },
  businessID: { required: true },
  dollars: { required: true },
  stars: { required: true },
  review: { required: false }
};


/*
 * Route to create a new review.
 */
router.post('/', function (req, res, next) {
  if (validation.validateAgainstSchema(req.body, reviewSchema)) {
    let review = validation.extractValidFields(req.body, reviewSchema);
    mysqldb.postReview(review)
      .then((insertId) => {
        res.status(201).json({
          id: insertId,
          /* Generate HATEOAS links for surrounding pages.*/
          links: {
            review: `/reviews/${insertId}`,
            business: `/businesses/${review.businessID}`
          }
        });
      })
      /* errObj is a custom object */
      .catch((errObj) => {
        res.status(errObj.code).json({
          error: errObj.err
        });
      });
  }
  else {
    res.status(400).json({
      error: "Request body is not a valid review object"
    });
  }
});

/*
 * Route to fetch info about a specific review.
 */
router.get('/:reviewID', function (req, res, next) {
  const reviewID = parseInt(req.params.reviewID);
  mysqldb.getReview(reviewID)
    .then((reviewInfo) => {
      if(reviewInfo){
        res.status(200).json(reviewInfo);
      }
      else{
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        err: `unable to get review with id = ${reviewID}`
      });
    });
});
/*
 * Route to update a review.
 */
router.put('/:reviewID', function (req, res, next) {
  const reviewID = parseInt(req.params.reviewID);
  if (validation.validateAgainstSchema(req.body, reviewSchema)) {
    let updatedReview = validation.extractValidFields(req.body, reviewSchema);
    mysqldb.putReview(updatedReview, reviewID)
      .then((updateSuccessful) => {
        if(updateSuccessful){
          res.status(200).json({
            /* Generate HATEOAS links for surrounding pages.*/
            links: {
              review: `/reviews/${reviewID}`,
              business: `/businesses/${updatedReview.businessID}`
            }
          });
        }
        else{
          next();
        }
      })
      /* errObj is a custom object */
      .catch((errObj) => {
        res.status(errObj.code).json({
          error: errObj.err
        });
      });
  }
  else {
    res.status(400).json({
      error: "Request body is not a valid review object"
    });
  }
});

/*
 * Route to delete a review.
 */
router.delete('/:reviewID', function (req, res, next) {
  const reviewID = parseInt(req.params.reviewID);
  mysqldb.deleteReview(reviewID)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).send();
      }
      else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: `Unable to delete the review with ID: ${reviewID}`
      });
    });
});
