import { faker } from '@faker-js/faker';

const generateMockVideo = () => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  thumbnail: faker.image.url(),
  channelName: faker.person.fullName(),
  views: faker.number.int({ min: 100, max: 1000000 }),
  uploadDate: faker.date.past(),
  duration: faker.time.minute(),
});

// eslint-disable-next-line no-unused-vars
export const searchVideos = async (_searchParams) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const videos = Array.from({ length: 20 }, generateMockVideo);
  return videos;
};

// eslint-disable-next-line no-unused-vars
export const getSuggestions = async (_query) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Array.from({ length: 5 }, () => faker.lorem.words(3));
};

// eslint-disable-next-line no-unused-vars
export const mockSignIn = async (email, _password) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { user: { uid: faker.string.uuid(), email } };
};

export const mockSignOut = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
};