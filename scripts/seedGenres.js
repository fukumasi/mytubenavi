const admin = require('firebase-admin');
const serviceAccount = require('C:\\Users\\owner\\Desktop\\mytubenavifirebasesecretkey\\mytubenavi-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const seedGenres = async () => {
  try {
    // Delete existing genres
    const genresRef = db.collection('genres');
    const snapshot = await genresRef.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("Existing genres deleted successfully");

    // Seed large genres
    const largeGenres = [
      { name: "Music", level: "large", slug: "music" },
      { name: "Movies", level: "large", slug: "movies" },
      { name: "Games", level: "large", slug: "games" },
    ];

    const largeGenreRefs = await Promise.all(largeGenres.map(genre => 
      genresRef.add(genre)
    ));
    console.log("Large genres seeded successfully");

    // Seed medium genres
    const mediumGenres = [
      { name: "Rock", level: "medium", slug: "rock", parent: largeGenreRefs[0].id },
      { name: "Pop", level: "medium", slug: "pop", parent: largeGenreRefs[0].id },
      { name: "Action", level: "medium", slug: "action", parent: largeGenreRefs[1].id },
      { name: "Comedy", level: "medium", slug: "comedy", parent: largeGenreRefs[1].id },
      { name: "RPG", level: "medium", slug: "rpg", parent: largeGenreRefs[2].id },
      { name: "FPS", level: "medium", slug: "fps", parent: largeGenreRefs[2].id },
    ];

    const mediumGenreRefs = await Promise.all(mediumGenres.map(genre => 
      genresRef.add(genre)
    ));
    console.log("Medium genres seeded successfully");

    // Seed small genres
    const smallGenres = [
      { name: "Classic Rock", level: "small", slug: "classic-rock", parent: mediumGenreRefs[0].id },
      { name: "K-pop", level: "small", slug: "k-pop", parent: mediumGenreRefs[1].id },
      { name: "Superhero", level: "small", slug: "superhero", parent: mediumGenreRefs[2].id },
      { name: "Romantic Comedy", level: "small", slug: "romantic-comedy", parent: mediumGenreRefs[3].id },
      { name: "JRPG", level: "small", slug: "jrpg", parent: mediumGenreRefs[4].id },
      { name: "Battle Royale", level: "small", slug: "battle-royale", parent: mediumGenreRefs[5].id },
    ];

    await Promise.all(smallGenres.map(genre => 
      genresRef.add(genre)
    ));
    console.log("Small genres seeded successfully");

    console.log("All genres seeded successfully");
  } catch (error) {
    console.error("Error seeding genres:", error);
  } finally {
    admin.app().delete();
  }
};

seedGenres();