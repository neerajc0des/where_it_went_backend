import prisma from "../../config/db";

export const generateBalanceWarningNudgeService = async (userId: string) => {
  const accountsWithBudget = await prisma.account.findMany({
    where: {
      userId,
      isArchived: false,
      monthlyBudget: {not: null, gt: 0}
    }
  })

  if(accountsWithBudget.length === 0){
      return [];
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const startOfMonth = new Date(today.getFullYear(), currentMonth - 1, 1);
  const daysInMonth = new Date(today.getFullYear(), currentMonth, 0).getDate();
  const currentDay = today.getDate();

  const balanceWarningNudges = [];

  for(const account of accountsWithBudget){
    const alreadySent = await prisma.nudge.findFirst({
      where: {
        userId,
        type: 'BALANCE_WARNING',
        message: { contains: account.name },
        createdAt: { gte: startOfMonth }
      }
    });

    if (alreadySent) continue;

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lte: today
        }
      }
    });

    const spendingTillNow = transactions.reduce((sum, t)=>{ 
      return sum+t.amount.toNumber()
    }, 0)

    if(spendingTillNow===0) continue;

    const avgDailySpend = spendingTillNow/currentDay;
    const approxSpendThisMonth = avgDailySpend*daysInMonth;
    const allowedBudget = Number(account.monthlyBudget);


    if(approxSpendThisMonth>allowedBudget){
      const extra = Math.round(approxSpendThisMonth - allowedBudget);

      const message =  `${account.name} budget may overshoot by ₹${extra} this month.`;

      const nudge = await prisma.nudge.create({
        data: {
          type: 'BALANCE_WARNING',
          message,
          userId
        },
        omit: { userId: true }
      });

      balanceWarningNudges.push(nudge);
    }
  }

  return balanceWarningNudges;

}

export const markNudgeAsReadService = async (
  nudgeId: string, 
  userId: string
) => {
  const nudge = await prisma.nudge.findFirst({
    where: { 
      id: nudgeId, 
      userId
    }
  });

  if (!nudge) throw new Error('Nudge not found');

  return prisma.nudge.update({
    where: { id: nudgeId },
    data: { isRead: true }
  });
}

export const getAllNudgesService = async (userId: string) => {
  return await prisma.nudge.findMany({
    where: { userId },
    orderBy: [
      { isRead: 'asc' },   
      { createdAt: 'desc' }
    ],
    omit: { userId: true }
  });
};

export const deleteNudgeService = async (nudgeId: string, userId: string) => {
  const nudge = await prisma.nudge.findFirst({
    where: { id: nudgeId, userId }
  });
  if (!nudge) throw new Error('Nudge not found');

  await prisma.nudge.delete({ where: { id: nudgeId } });
  return { message: 'Nudge deleted' };
};