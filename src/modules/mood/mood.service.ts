import prisma from '../../config/db';
import { CreateMoodInput } from './mood.schema';

export const createMoodService = async (
  userId: string,
  payload: CreateMoodInput
) => {
  const { mood, note, loggedAt } = payload;

  const date = new Date(loggedAt ?? Date.now());
  const hourOfDay = date.getHours();

  return await prisma.mood.create({
    data: {
      mood,
      note,
      loggedAt: date,
      hourOfDay,
      userId
    }
  });
};

export const getMoodsService = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const moods = await prisma.mood.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    skip,
    take: limit,
    omit: { userId: true }
  });

  const total = await prisma.mood.count({ where: { userId } });

  return {
    moods,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getMoodByIdService = async (
  moodId: string,
  userId: string
) => {
  const mood = await prisma.mood.findFirst({
    where: { id: moodId, userId },
    omit: { userId: true }
  });

  if (!mood) throw new Error('Mood data not found');
  return mood;
};

export const deleteMoodService = async (
  moodId: string,
  userId: string
) => {
  const mood = await prisma.mood.findFirst({
    where: { id: moodId, userId }
  });

  if (!mood) throw new Error('Mood data not found');

  await prisma.mood.delete({ where: { id: moodId } });
  return { message: 'Mood deleted successfully' };
};
