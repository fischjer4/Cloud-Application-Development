const router = require('express').Router();
const validation = require('../../lib/validation');

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


/******************************************************
*				Reviews Queries
*******************************************************/
function getReviewsByBusinessID(businessID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM reviews WHERE businessID = ?',
      [ businessID ],
      function(err, result){
        if(err){
          reject(err);
        }
        else{
          resolve(result);
        }
      }
    );

  });
}
function postReview(reviewInfo, mysqlPool){
  return new Promise((resolve, reject) => {
    const reviewValues = {
      id: null,
      userID: reviewInfo.userID,
      businessID:  reviewInfo.businessID,
      dollars:  reviewInfo.dollars,
      stars:  reviewInfo.stars,
      review: reviewInfo.review
    };
    /*
     * Make sure the user is not trying to review the same business twice.
     * 1. See if there is already a reivew by this user for this business
     * 2. If no, then insert it
     * 3. If yes, return 403
     */
    mysqlPool.query(
      'SELECT * FROM reviews WHERE businessID = ? AND userID = ?',
      [ reviewValues.businessID, reviewValues.userID ],
      function (err, result) {
        if (err) {
          reject({code: 500, err: "Couldn't insert review into the database"});
        }
        else {
          if(result.length == 0){
            /* User hasn't entered a review for this business yet */
            mysqlPool.query(
              'INSERT INTO reviews SET ?',
              [ reviewValues ],
              function(err, result){
                if(err){
                  reject({code: 500, err: "Couldn't insert review into the database"});
                }
                else{
                  resolve(result.insertId);
                }
              });
          }
          else{
            /* User has already entered a review for this business */
            reject({code: 403, err: "User has already posted a review of this business"});
          }
        }
      }
    );
  });
}
function getReview(reviewID, mysqlPool){
  return new Promise((resolve, reject) => {

    mysqlPool.query(
      'SELECT * FROM reviews WHERE id = ?',
      [ reviewID ],
      function(err, result){
        if(err){
          reject(err);
        }
        else{
          resolve(result[0]);
        }
      }
    )
  });
}
function putReview(updatedReview, reviewID, mysqlPool){
  return new Promise((resolve, reject) => {
    const reviewValues = {
      id: reviewID,
      userID: updatedReview.userID,
      businessID:  updatedReview.businessID,
      dollars:  updatedReview.dollars,
      stars:  updatedReview.stars,
      review: updatedReview.review
    };
    /*
     * Make sure the updated review has the same businessID and userID as
     * the existing review.
     * 1. get the old review
     * 2. verify the BID and UID match
     */
     getReview(reviewID, mysqlPool)
      .then((oldReview) => {
        if(oldReview){
          /* Valid reviewID, now check conditions */
          if(oldReview.businessID != reviewValues.businessID || oldReview.userID != reviewValues.userID){
            /* BID and UID DONT match, don't update new review */
            reject({code: 403, err: "The new review's businessID and userID must match the old review's"})
          }
          else{
            /* BID and UID match, okay to update new review */
            mysqlPool.query(
              'UPDATE reviews SET ? WHERE id = ?',
              [ reviewValues, reviewID ],
              function(err, result){
                if(err){
                  reject({code: 500, err: `Unable to update the review with ID: ${reviewID} into the database`});
                }
                else{
                  resolve(result.affectedRows > 0);
                }
              }
            )
          }
        }
        else{
          /* No matching reviewID, return and let called handle the 404 */
          resolve(null)
        }
      })
      /* Error from the getReview call */
      .catch((err) => {
        reject({code: 500, err: `Unable to update the review with ID: ${reviewID} into the database`});
      });
  });
}
function deleteReview(reviewID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM reviews WHERE id = ?',
      [ reviewID ],
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
function getReviewsByUserID(userID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM reviews WHERE userID=?',
      [ userID ],
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
*				Reviews Routes
*******************************************************/
/*
 * Route to create a new review.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, reviewSchema)) {
    let review = validation.extractValidFields(req.body, reviewSchema);
    postReview(review, mysqlPool)
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
  const mysqlPool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  getReview(reviewID, mysqlPool)
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
  const mysqlPool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  if (validation.validateAgainstSchema(req.body, reviewSchema)) {
    let updatedReview = validation.extractValidFields(req.body, reviewSchema);
    putReview(updatedReview, reviewID, mysqlPool)
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
  const mysqlPool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  deleteReview(reviewID, mysqlPool)
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

exports.router = router;
exports.getReviewsByBusinessID = getReviewsByBusinessID;
exports.getReviewsByUserID = getReviewsByUserID;
