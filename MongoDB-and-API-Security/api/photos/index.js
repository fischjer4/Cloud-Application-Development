const router = require('express').Router();
const validation = require('../../lib/validation');

/*
 * Schema describing required/optional fields of a photo object.
 */
const photoSchema = {
  userID: { required: true },
  businessID: { required: true },
  caption: { required: false },
  data: { required: true }
};


/******************************************************
*				Photos Queries
*******************************************************/
function getPhotosByBusinessID(businessID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM photos WHERE businessID = ?',
      businessID,
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
function postPhoto(photoInfo, mysqlPool){
  return new Promise((resolve, reject) => {
    const photoValues = {
      id: null,
      userID: photoInfo.userID,
      businessID:  photoInfo.businessID,
      caption:  photoInfo.caption,
      data:  photoInfo.data
    };
    mysqlPool.query(
      'INSERT INTO photos SET ?',
      [ photoValues ],
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
function getPhoto(photoID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM photos WHERE id = ?',
      [ photoID ],
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
function putPhoto(updatedPhoto, photoID, mysqlPool){
  return new Promise((resolve, reject) => {
    const photoValues = {
      id: photoID,
      userID: updatedPhoto.userID,
      businessID:  updatedPhoto.businessID,
      caption:  updatedPhoto.caption,
      data:  updatedPhoto.data
    };

    /*
     * Make sure the updated photo has the same businessID and userID as
     * the existing photo.
     * 1. get the old Photos
     * 2. verify the BID and UID match
     */
     getPhoto(photoID, mysqlPool)
      .then((oldPhoto) => {
        if(oldPhoto){
          /* Valid photoID, now check conditions */
          if(oldPhoto.businessID != photoValues.businessID || oldPhoto.userID != photoValues.userID){
            /* BID and UID DONT match, don't update new photo */
            reject({code: 403, err: "The new photo's businessID and userID must match the old photo's"})
          }
          else{
            /* BID and UID match, okay to update new photo */
            mysqlPool.query(
              'UPDATE photos SET ? WHERE id = ?',
              [ photoValues, photoID ],
              function(err, result){
                if(err){
                  reject({code: 500, err: `Unable to update the photo with ID: ${photoID} into the database`});
                }
                else{
                  resolve(result.affectedRows > 0);
                }
              }
            )
          }
        }
        else{
          /* No matching photoID, return and let called handle the 404 */
          resolve(null)
        }
      })
      /* Error from the getPhoto call */
      .catch((err) => {
        reject({code: 500, err: `Unable to update the photo with ID: ${photoID} into the database`});
      });
  });
}
function deletePhoto(photoID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM photos WHERE id = ?',
      [ photoID ],
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
function getPhotosByUserID(userID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM photos WHERE userID=?',
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
*				Photos Routes
*******************************************************/
/*
 * Route to create a new photo.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, photoSchema)) {
    let photo = validation.extractValidFields(req.body, photoSchema);
    postPhoto(photo, mysqlPool)
      .then((insertId) => {
        res.status(201).json({
          id: insertId,
          /* Generate HATEOAS links for surrounding pages.*/
          links: {
            photo: `/photos/${insertId}`,
            business: `/businesses/${photo.businessID}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to insert the photo into the database`
        });
      });
  }
  else {
    res.status(400).json({
      error: "Request body is not a valid photo object"
    });
  }
});
/*
 * Route to fetch info about a specific photo.
 */
router.get('/:photoID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const photoID = parseInt(req.params.photoID);
  getPhoto(photoID, mysqlPool)
    .then((photoInfo) => {
      if(photoInfo){
        res.status(200).json(photoInfo);
      }
      else{
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        err: `unable to get photo with id = ${photoID}`
      });
    });
});
/*
 * Route to update a photo.
 */
router.put('/:photoID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const photoID = parseInt(req.params.photoID);
  if (validation.validateAgainstSchema(req.body, photoSchema)) {
    let updatedPhoto = validation.extractValidFields(req.body, photoSchema);
    putPhoto(updatedPhoto, photoID, mysqlPool)
      .then((updateSuccessful) => {
        if(updateSuccessful){
          res.status(200).json({
            links: {
              photo: `/photos/${photoID}`,
              business: `/businesses/${updatedPhoto.businessID}`
            }
          });
        }
        else{
          next();
        }
      })
      /* Custom object is returned */
      .catch((errObj) => {
        res.status(errObj.code).json({
          err: errObj.err
        });
      });
  }
  else {
    res.status(400).json({
      error: "Request body is not a valid photo object"
    });
  }
});

/*
 * Route to delete a photo.
 */
router.delete('/:photoID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const photoID = parseInt(req.params.photoID);
  deletePhoto(photoID, mysqlPool)
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
        error: `Unable to delete the photo with ID: ${photoID}`
      });
    });
});


exports.router = router;
exports.getPhotosByBusinessID = getPhotosByBusinessID;
exports.getPhotosByUserID = getPhotosByUserID
