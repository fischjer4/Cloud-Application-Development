const router = require('express').Router();

exports.router = router;

const { businesses } = require('../businesses');
const { reviews } = require('../reviews');
const { photos } = require('../photos');

/*
 * Route to list all of a user's businesses.
 */
router.get('/:userID/businesses', function (req, res) {
  const userID = parseInt(req.params.userID);
  let userBusinesses = businesses.filter(business => business.ownerID === userID);
  res.status(200).json({
    businesses: userBusinesses
  });
});

/*
 * Route to list all of a user's reviews.
 */
router.get('/:userID/reviews', function (req, res) {
  const userID = parseInt(req.params.userID);
  let userReviews = reviews.filter(review => review.userID === userID);
  res.status(200).json({
    reviews: userReviews
  });
});

/*
 * Route to list all of a user's photos.
 */
router.get('/:userID/photos', function (req, res) {
  const userID = parseInt(req.params.userID);
  let userPhotos = photos.filter(photo => photo.userID === userID);
  res.status(200).json({
    photos: userPhotos
  });
});
