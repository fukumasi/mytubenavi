import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';

export const getTopLevelGenres = async (db) => {
  const genresCollection = collection(db, 'genres');
  const topLevelGenresQuery = query(genresCollection, where("level", "==", 0), orderBy("order"));
  const genresSnapshot = await getDocs(topLevelGenresQuery);
  return genresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSubGenres = async (db, parentId) => {
  const genresCollection = collection(db, 'genres');
  const subGenresQuery = query(genresCollection, where("parentId", "==", parentId), orderBy("order"));
  const subGenresSnapshot = await getDocs(subGenresQuery);
  return subGenresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getGenreById = async (db, genreId) => {
  const genreDoc = await getDoc(doc(db, "genres", genreId));
  if (genreDoc.exists()) {
    return { id: genreDoc.id, ...genreDoc.data() };
  } else {
    throw new Error("Genre not found");
  }
};