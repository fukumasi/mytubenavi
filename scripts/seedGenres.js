const mongoose = require('mongoose');
const Genre = require('../src/models/Genre');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const seedGenres = async () => {
  try {
    await Genre.deleteMany({}); // 既存のジャンルをクリア

    const largeGenres = [
      { name: 'Music', level: 'large', slug: 'music' },
      { name: 'Movies', level: 'large', slug: 'movies' },
      { name: 'Games', level: 'large', slug: 'games' }
    ];

    const savedLargeGenres = await Genre.insertMany(largeGenres);
    console.log('Large genres seeded successfully');

    const mediumGenres = [
      { name: 'Rock', level: 'medium', slug: 'rock', parent: savedLargeGenres[0]._id },
      { name: 'Pop', level: 'medium', slug: 'pop', parent: savedLargeGenres[0]._id },
      { name: 'Action', level: 'medium', slug: 'action', parent: savedLargeGenres[1]._id },
      { name: 'Comedy', level: 'medium', slug: 'comedy', parent: savedLargeGenres[1]._id },
      { name: 'RPG', level: 'medium', slug: 'rpg', parent: savedLargeGenres[2]._id },
      { name: 'FPS', level: 'medium', slug: 'fps', parent: savedLargeGenres[2]._id }
    ];

    const savedMediumGenres = await Genre.insertMany(mediumGenres);
    console.log('Medium genres seeded successfully');

    const smallGenres = [
      { name: 'Classic Rock', level: 'small', slug: 'classic-rock', parent: savedMediumGenres[0]._id },
      { name: 'K-pop', level: 'small', slug: 'k-pop', parent: savedMediumGenres[1]._id },
      { name: 'Superhero', level: 'small', slug: 'superhero', parent: savedMediumGenres[2]._id },
      { name: 'Romantic Comedy', level: 'small', slug: 'romantic-comedy', parent: savedMediumGenres[3]._id },
      { name: 'JRPG', level: 'small', slug: 'jrpg', parent: savedMediumGenres[4]._id },
      { name: 'Battle Royale', level: 'small', slug: 'battle-royale', parent: savedMediumGenres[5]._id }
    ];

    await Genre.insertMany(smallGenres);
    console.log('Small genres seeded successfully');

    console.log('All genres seeded successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding genres:', error);
    mongoose.connection.close();
  }
};

seedGenres();