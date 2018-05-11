const router = require('express').Router();
const validation = require('../../lib/validation');
const mysqldb = require('../../MySQL/mysql');

let photos = require('./photos');

exports.router = router;
exports.photos = photos;

/*
 * Schema describing required/optional fields of a photo object.
 */
const photoSchema = {
  userID: { required: true },
  businessID: { required: true },
  caption: { required: false },
  data: { required: true }
};


/*
 * Route to create a new photo.
 */
router.post('/', function (req, res, next) {
  if (validation.validateAgainstSchema(req.body, photoSchema)) {
    let photo = validation.extractValidFields(req.body, photoSchema);
    mysqldb.postPhoto(photo)
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
  const photoID = parseInt(req.params.photoID);
  mysqldb.getPhoto(photoID)
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
  const photoID = parseInt(req.params.photoID);
  if (validation.validateAgainstSchema(req.body, photoSchema)) {
    let updatedPhoto = validation.extractValidFields(req.body, photoSchema);
    mysqldb.putPhoto(updatedPhoto, photoID)
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
  const photoID = parseInt(req.params.photoID);
  mysqldb.deletePhoto(photoID)
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
