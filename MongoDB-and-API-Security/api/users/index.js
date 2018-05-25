const router = require('express').Router();
const bcrypt = require('bcryptjs');
const validation = require('../../lib/validation');
const { getBusinessesByOwnerID } = require('../businesses');
const { getReviewsByUserID } = require('../reviews');
const { getPhotosByUserID } = require('../photos');
const { generateAuthToken, requireAuthentication } = require('../../lib/auth');

/*
 * Schema describing required/optional fields of a review object.
 */
const newUserSchema = {
  username: { required: true },
  email: { required: true },
  password: { required: true }
};
const loginUserSchema = {
  username: { required: true},
  password: { required: true}
}



/******************************************************
*				Users Queries
*******************************************************/
function postNewUser(userDocument, mongoDB){
  return new Promise((resolve, reject) => {
    const usersCollection = mongoDB.collection('users');
    bcrypt.hash(userDocument.password, 8, function(err, hash){
      if(err){
        reject(err);
      }
      else{
        userDocument.password = hash;
        usersCollection.insertOne(userDocument)
          .then((result) => {
            resolve(result.insertedId);
          });
      }
    });
  });
}
function getUserByUserName(userName, mongoDB, includePassword){
  const usersCollection = mongoDB.collection('users');
  const projection = includePassword ? {} : { password: 0 };
  return usersCollection
    .find({username: userName})
    .project(projection)
    .toArray()
    .then((results) => {
        return Promise.resolve(results[0]);
    });
}
function deleteUserByUserName(userName, mongoDB){
  const usersCollection = mongoDB.collection('users');
  return usersCollection.deleteOne({username: userName})
    .then((results) => {
        return Promise.resolve(results.deletedCount > 0);
    });
}












/******************************************************
*				Users Routes
*******************************************************/
/*
 * Route for a user to sign up
 */
router.post('/', function(req, res, next) {
  const mongoDB = req.app.locals.mongoDB;
  if (validation.validateAgainstSchema(req.body, newUserSchema)) {
    let userData = validation.extractValidFields(req.body, newUserSchema);
    getUserByUserName(userData.username, mongoDB)
      .then((isNotUnique) => {
        if(isNotUnique){
          res.status(400).json({
            error: `The username ${userData.username} is already taken`
          });
        } else{
          return postNewUser(userData, mongoDB);
        }
      })
      .then((insertId) => {
        res.status(201).json({
          id: insertId,
          username: userData.username,
          /* Generate HATEOAS links for surrounding pages.*/
          links: {
            user: `/users/${userData.username}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to insert the new user into the database`
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid new user object"
    });
  }
});
/*
 * Route for a user to login and get a JWT
 */
router.post('/login', function (req, res) {
  const mongoDB = req.app.locals.mongoDB;
  if (validation.validateAgainstSchema(req.body, loginUserSchema)) {
    let clientData = validation.extractValidFields(req.body, newUserSchema);
    let userID = null ;
    getUserByUserName(clientData.username, mongoDB, true)
      .then((user) => {
        if (user) {
          userID = user._id;
          return bcrypt.compare(clientData.password, user.password);
        } else {
          return Promise.reject(401);
        }
      })
      .then((loginSuccessful) => {
        if (loginSuccessful) {
          return generateAuthToken(clientData.username, userID);
        } else {
          return Promise.reject(401);
        }
      })
      .then((token) => {
        res.status(200).json({
          auth: true,
          token: token
        });
      })
      .catch((err) => {
        if (err === 401) {
          res.status(401).json({
            error: "Invalid credentials."
          });
        } else {
          res.status(500).json({
            error: "Failed to fetch user."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request needs a username and password."
    })
  }
});
/*
 * Route to get the users data.
 */
router.get('/:userName', requireAuthentication, function (req, res, next) {
  const mongoDB = req.app.locals.mongoDB;
  const userName = req.params.userName;
  if (req.username !== userName) {
      res.status(403).json({
        error: "Unauthorized to access that resource"
      });
  }
  else {
    getUserByUserName(userName, mongoDB)
      .then((userObject) => {
        if(userObject){
          res.status(200).json(userObject);
        }
        else{
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to fetch the user's businesses from the database`
        });
      });
  }
});
/*
 * Route to delete a user.
 */
router.delete('/:userName', requireAuthentication, function (req, res, next) {
  const mongoDB = req.app.locals.mongoDB;
  const userName = req.params.userName;
  if (req.username !== userName) {
      res.status(403).json({
        error: "Unauthorized to access that resource"
      });
  }
  else {
    deleteUserByUserName(userName, mongoDB)
      .then((userObject) => {
        if(userObject){
          res.status(204).send();
        }
        else{
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to fetch the user's businesses from the database`
        });
      });
  }
});
/*
 * Route to list all of a user's businesses.
 */
router.get('/:userName/businesses', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const mongoDB = req.app.locals.mongoDB;
  const userName = req.params.userName;
  if (req.username !== userName) {
      res.status(403).json({
        error: "Unauthorized to access that resource"
      });
  }
  else {
    getBusinessesByOwnerID(req.userID, mysqlPool)
      .then((userBusinesses) => {
        if(userBusinesses){
          res.status(200).json({
            businesses: userBusinesses
          });
        }
        else{
          /* Not a valid user */
          res.status(404).json({
            error: "Requested resource " + req.originalUrl + " does not exist"
          });
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to fetch the user's businesses from the database`
        });
      });
  }
});
/*
 * Route to list all of a user's reviews.
 */
router.get('/:userName/reviews', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const mongoDB = req.app.locals.mongoDB;
  const userName = req.params.userName;
  if (req.username !== userName) {
      res.status(403).json({
        error: "Unauthorized to access that resource"
      });
  }
  else {
    getReviewsByUserID(req.userID, mysqlPool, mongoDB)
      .then((userReviews) => {
        if(userReviews){
          res.status(200).json({
            reviews: userReviews
          });
        } else {
            /* Not a valid user */
            res.status(404).json({
              error: "Requested resource " + req.originalUrl + " does not exist"
            });
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to fetch the user's reviews from the database`
        });
      });
    }
  });

/*
 * Route to list all of a user's photos.
 */
router.get('/:userName/photos', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const mongoDB = req.app.locals.mongoDB;
  const userName = req.params.userName;
  if (req.username !== userName) {
      res.status(403).json({
        error: "Unauthorized to access that resource"
      });
  }
  else {
    getPhotosByUserID(req.userID, mysqlPool)
      .then((userPhotos) => {
        if (userPhotos) {
          res.status(200).json({
            photos: userPhotos
          });
        } else {
          /* Not a valid user */
          res.status(404).json({
            error: "Requested resource " + req.originalUrl + " does not exist"
          });
        }

      })
      .catch((err) => {
        res.status(500).json({
          error: `Unable to fetch the user's photos from the database`
        });
      });
    }
  });

exports.router = router;
