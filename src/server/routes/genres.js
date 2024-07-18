const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');

router.get('/large', genreController.getLargeGenres);
router.get('/:largeGenreSlug/medium', genreController.getMediumGenres);
router.get('/:mediumGenreSlug/small', genreController.getSmallGenres);

module.exports = router;