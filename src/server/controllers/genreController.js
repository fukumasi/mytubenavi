const Genre = require('../models/Genre');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // 10分間キャッシュ

exports.getLargeGenres = async (req, res, next) => {
  console.log('getLargeGenres called');
  try {
    const cachedGenres = cache.get('largeGenres');
    if (cachedGenres) {
      console.log('Returning cached large genres');
      return res.json(cachedGenres);
    }

    console.log('Cache miss. Querying database for large genres');
    const genres = await Genre.find({ level: 'large' }).sort('name');
    
    console.log('Query result:', genres);

    if (!genres || genres.length === 0) {
      console.log('No large genres found in database');
      return res.status(404).json({ message: 'No large genres found' });
    }

    console.log(`Found ${genres.length} large genres. Caching results.`);
    cache.set('largeGenres', genres);
    res.json(genres);
  } catch (err) {
    console.error('Error in getLargeGenres:', err);
    next(err);
  }
};

exports.getMediumGenres = async (req, res, next) => {
  console.log('getMediumGenres called');
  try {
    const { largeGenreSlug } = req.params;
    const cacheKey = `mediumGenres_${largeGenreSlug}`;
    
    const cachedGenres = cache.get(cacheKey);
    if (cachedGenres) {
      console.log('Returning cached medium genres');
      return res.json(cachedGenres);
    }

    console.log(`Querying database for medium genres of large genre ${largeGenreSlug}`);
    const largeGenre = await Genre.findOne({ slug: largeGenreSlug, level: 'large' });
    console.log('Large genre found:', largeGenre);
    
    if (!largeGenre) {
      console.log(`Large genre with slug ${largeGenreSlug} not found`);
      return res.status(404).json({ message: 'Large genre not found' });
    }

    const genres = await Genre.find({ level: 'medium', parent: largeGenre._id }).sort('name');
    console.log('Medium genres found:', genres);
    
    if (!genres || genres.length === 0) {
      console.log(`No medium genres found for large genre ${largeGenreSlug}`);
      return res.status(404).json({ message: 'No medium genres found for this large genre' });
    }

    console.log(`Found ${genres.length} medium genres. Caching results.`);
    cache.set(cacheKey, genres);
    res.json(genres);
  } catch (err) {
    console.error('Error in getMediumGenres:', err);
    next(err);
  }
};

exports.getSmallGenres = async (req, res, next) => {
  console.log('getSmallGenres called');
  try {
    const { mediumGenreSlug } = req.params;
    const cacheKey = `smallGenres_${mediumGenreSlug}`;
    
    const cachedGenres = cache.get(cacheKey);
    if (cachedGenres) {
      console.log('Returning cached small genres');
      return res.json(cachedGenres);
    }

    console.log(`Querying database for small genres of medium genre ${mediumGenreSlug}`);
    const mediumGenre = await Genre.findOne({ slug: mediumGenreSlug, level: 'medium' });
    console.log('Medium genre found:', mediumGenre);
    
    if (!mediumGenre) {
      console.log(`Medium genre with slug ${mediumGenreSlug} not found`);
      return res.status(404).json({ message: 'Medium genre not found' });
    }

    const genres = await Genre.find({ level: 'small', parent: mediumGenre._id }).sort('name');
    console.log('Small genres found:', genres);
    
    if (!genres || genres.length === 0) {
      console.log(`No small genres found for medium genre ${mediumGenreSlug}`);
      return res.status(404).json({ message: 'No small genres found for this medium genre' });
    }

    console.log(`Found ${genres.length} small genres. Caching results.`);
    cache.set(cacheKey, genres);
    res.json(genres);
  } catch (err) {
    console.error('Error in getSmallGenres:', err);
    next(err);
  }
};