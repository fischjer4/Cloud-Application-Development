const router = module.exports = require('express').Router();

const { router: businessesRouter } = require('./businesses');
const { router: reviewsRouter } = require('./reviews');
const { router: photosRouter } = require('./photos');
const { router: categoriesRouter } = require('./categories');
const { router: usersRouter } = require('./users');

router.use('/businesses', businessesRouter);
router.use('/reviews', reviewsRouter);
router.use('/photos', photosRouter);
router.use('/categories', categoriesRouter);
router.use('/users', usersRouter);
