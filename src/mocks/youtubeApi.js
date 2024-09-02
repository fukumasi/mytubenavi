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

export const searchVideos = async (searchParams) => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const videos = Array.from({ length: 20 }, generateMockVideo);
  return videos;
};

export const getSuggestions = async (query) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Array.from({ length: 5 }, () => faker.lorem.words(3));
};