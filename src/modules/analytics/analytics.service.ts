import { Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { PeriodStatsQuery } from "./analytics.schema";

type Granularity = 'day' | 'week' | 'month';

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// `from` / `to` come in as plain calendar days (YYYY-MM-DD). We anchor them to UTC
// because Postgres date_trunc buckets the stored UTC timestamps — anchoring to the
// server's local zone instead would leave the range edges and the buckets misaligned.
const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const resolvePeriod = (from?: string, to?: string) => {
  const end = to
    ? new Date(`${to}T23:59:59.999Z`)
    : new Date(startOfUtcDay(new Date()).getTime() + DAY_MS - 1);

  // default window is the 30 days ending on `end` (inclusive)
  const start = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(startOfUtcDay(end).getTime() - 29 * DAY_MS);

  const days = Math.round((startOfUtcDay(end).getTime() - start.getTime()) / DAY_MS) + 1;

  return { start, end, days };
};

// Anything that isn't an explicit bucket size — 'auto', or an unset value from a caller
// that skipped validation — falls through to being picked from the range length. Never
// return the input unchecked: it indexes into the date_trunc map, and a miss there would
// interpolate as a NULL parameter and silently collapse the series into one empty bucket.
const resolveGranularity = (
  groupBy: PeriodStatsQuery['groupBy'] | undefined,
  days: number
): Granularity => {
  if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') return groupBy;

  if (days <= 31) return 'day';
  if (days <= 182) return 'week';
  return 'month';
};

// Mirrors what Postgres date_trunc does, so the generated buckets line up with the rows.
const startOfBucket = (date: Date, granularity: Granularity) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (granularity === 'month') return new Date(Date.UTC(year, month, 1));

  if (granularity === 'week') {
    // date_trunc('week') anchors to Monday
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(year, month, day - daysSinceMonday));
  }

  return new Date(Date.UTC(year, month, day));
};

const nextBucket = (bucket: Date, granularity: Granularity) => {
  if (granularity === 'month')
    return new Date(Date.UTC(bucket.getUTCFullYear(), bucket.getUTCMonth() + 1, 1));

  return new Date(bucket.getTime() + (granularity === 'week' ? 7 : 1) * DAY_MS);
};

// Every bucket in the range, so the series has no holes for the client to chart around.
const buildBuckets = (start: Date, end: Date, granularity: Granularity) => {
  const buckets: string[] = [];

  let cursor = startOfBucket(start, granularity);
  while (cursor <= end) {
    buckets.push(cursor.toISOString().slice(0, 10));
    cursor = nextBucket(cursor, granularity);
  }

  return buckets;
};

const toNumber = (value: Prisma.Decimal | number | bigint | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value);

// date_trunc comes back as a Date from the driver, but a raw timestamp string would be
// parsed as local time and shift the key — so read the string form directly when we get one.
const bucketKey = (value: Date | string) =>
  typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const percentage = (part: number, total: number) =>
  total === 0 ? 0 : Number(((part / total) * 100).toFixed(1));

const round = (value: number) => Number(value.toFixed(2));

export const getAccountPeriodStatsService = async (
  userId: string,
  accountId: string,
  query: PeriodStatsQuery
) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
    select: {
      id: true,
      name: true,
      icon: true,
      balance: true,
      monthlyBudget: true,
    },
  });

  if (!account) throw new Error('Account not found');

  const { start, end, days } = resolvePeriod(query.from, query.to);
  const granularity = resolveGranularity(query.groupBy, days);

  const withinPeriod = Prisma.sql`
    t."accountId" = ${accountId}
    AND t.date >= ${start}
    AND t.date <= ${end}
  `;

  // granularity is a validated enum, but keeping the fragments literal leaves no
  // way for it to reach the query as interpolated text
  const truncate = {
    day: Prisma.sql`date_trunc('day', t.date)`,
    week: Prisma.sql`date_trunc('week', t.date)`,
    month: Prisma.sql`date_trunc('month', t.date)`,
  }[granularity];

  const [summaryRows, categoryRows, seriesRows, merchantRows, weekdayRows, hourRows] =
    await Promise.all([
      prisma.$queryRaw<{
        expense: Prisma.Decimal;
        income: Prisma.Decimal;
        expenseCount: bigint;
        incomeCount: bigint;
        largestExpense: Prisma.Decimal | null;
        smallestExpense: Prisma.Decimal | null;
        impulseAmount: Prisma.Decimal;
        impulseCount: bigint;
      }[]>`
        SELECT
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS expense,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0)  AS income,
          COUNT(*) FILTER (WHERE t.type = 'EXPENSE')                   AS "expenseCount",
          COUNT(*) FILTER (WHERE t.type = 'INCOME')                    AS "incomeCount",
          MAX(t.amount) FILTER (WHERE t.type = 'EXPENSE')              AS "largestExpense",
          MIN(t.amount) FILTER (WHERE t.type = 'EXPENSE')              AS "smallestExpense",
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE' AND t."isImpulse"), 0) AS "impulseAmount",
          COUNT(*) FILTER (WHERE t.type = 'EXPENSE' AND t."isImpulse") AS "impulseCount"
        FROM "Transaction" t
        WHERE ${withinPeriod};
      `,

      prisma.$queryRaw<{
        categoryId: string;
        category: string;
        icon: string | null;
        type: 'EXPENSE' | 'INCOME';
        amount: Prisma.Decimal;
        transactionCount: bigint;
      }[]>`
        SELECT
          c.id   AS "categoryId",
          c.name AS category,
          c.icon,
          t.type,
          SUM(t.amount) AS amount,
          COUNT(*)      AS "transactionCount"
        FROM "Transaction" t
        JOIN "TransactionCategory" c ON c.id = t."categoryId"
        WHERE ${withinPeriod}
        GROUP BY c.id, c.name, c.icon, t.type
        ORDER BY amount DESC;
      `,

      prisma.$queryRaw<{
        bucket: Date | string;
        expense: Prisma.Decimal;
        income: Prisma.Decimal;
        transactionCount: bigint;
      }[]>`
        SELECT
          ${truncate} AS bucket,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS expense,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0)  AS income,
          COUNT(*) AS "transactionCount"
        FROM "Transaction" t
        WHERE ${withinPeriod}
        GROUP BY 1
        ORDER BY 1;
      `,

      prisma.$queryRaw<{
        merchant: string;
        amount: Prisma.Decimal;
        transactionCount: bigint;
      }[]>`
        SELECT
          t.merchant,
          SUM(t.amount) AS amount,
          COUNT(*)      AS "transactionCount"
        FROM "Transaction" t
        WHERE ${withinPeriod}
          AND t.type = 'EXPENSE'
          AND t.merchant IS NOT NULL
          AND t.merchant <> ''
        GROUP BY t.merchant
        ORDER BY amount DESC
        LIMIT 5;
      `,

      prisma.$queryRaw<{
        dayOfWeek: number;
        amount: Prisma.Decimal;
        transactionCount: bigint;
      }[]>`
        SELECT
          t."dayOfWeek",
          COALESCE(SUM(t.amount), 0) AS amount,
          COUNT(*) AS "transactionCount"
        FROM "Transaction" t
        WHERE ${withinPeriod} AND t.type = 'EXPENSE'
        GROUP BY 1
        ORDER BY 1;
      `,

      prisma.$queryRaw<{
        hourOfDay: number;
        amount: Prisma.Decimal;
        transactionCount: bigint;
      }[]>`
        SELECT
          t."hourOfDay",
          COALESCE(SUM(t.amount), 0) AS amount,
          COUNT(*) AS "transactionCount"
        FROM "Transaction" t
        WHERE ${withinPeriod} AND t.type = 'EXPENSE'
        GROUP BY 1
        ORDER BY amount DESC
        LIMIT 1;
      `,
    ]);

  const summary = summaryRows[0]!;

  const totalExpense = toNumber(summary.expense);
  const totalIncome = toNumber(summary.income);
  const expenseCount = Number(summary.expenseCount);
  const incomeCount = Number(summary.incomeCount);
  const transactionCount = expenseCount + incomeCount;

  const mapCategories = (rows: typeof categoryRows, total: number) =>
    rows.map(row => ({
      categoryId: row.categoryId,
      category: row.category,
      icon: row.icon,
      amount: round(toNumber(row.amount)),
      transactionCount: Number(row.transactionCount),
      percentage: percentage(toNumber(row.amount), total),
    }));

  const expenseByCategory = mapCategories(
    categoryRows.filter(r => r.type === 'EXPENSE'),
    totalExpense
  );

  const incomeByCategory = mapCategories(
    categoryRows.filter(r => r.type === 'INCOME'),
    totalIncome
  );

  // index the rows Postgres actually returned, then walk the full bucket list
  const seriesByBucket = new Map(
    seriesRows.map(row => [bucketKey(row.bucket), row])
  );

  const timeSeries = buildBuckets(start, end, granularity).map(bucket => {
    const row = seriesByBucket.get(bucket);

    const expense = round(toNumber(row?.expense));
    const income = round(toNumber(row?.income));

    return {
      period: bucket,
      expense,
      income,
      net: round(income - expense),
      transactionCount: Number(row?.transactionCount ?? 0),
    };
  });

  const byDayOfWeek = weekdayRows.map(row => ({
    dayOfWeek: row.dayOfWeek,
    day: WEEKDAY_NAMES[row.dayOfWeek],
    amount: round(toNumber(row.amount)),
    transactionCount: Number(row.transactionCount),
    percentage: percentage(toNumber(row.amount), totalExpense),
  }));

  const busiestDay = [...byDayOfWeek].sort((a, b) => b.amount - a.amount)[0] ?? null;
  const busiestPeriod = [...timeSeries].sort((a, b) => b.expense - a.expense)[0] ?? null;

  const impulseAmount = toNumber(summary.impulseAmount);
  const peakHour = hourRows[0];

  return {
    account: {
      ...account,
      balance: toNumber(account.balance),
      monthlyBudget: account.monthlyBudget === null ? null : toNumber(account.monthlyBudget),
    },

    period: {
      from: start.toISOString(),
      to: end.toISOString(),
      days,
      groupBy: granularity,
    },

    summary: {
      totalExpense: round(totalExpense),
      totalIncome: round(totalIncome),
      netChange: round(totalIncome - totalExpense),
      transactionCount,
      expenseCount,
      incomeCount,
      avgExpensePerDay: round(totalExpense / days),
      avgExpensePerTransaction: expenseCount === 0 ? 0 : round(totalExpense / expenseCount),
      largestExpense: round(toNumber(summary.largestExpense)),
      smallestExpense: round(toNumber(summary.smallestExpense)),
    },

    impulse: {
      amount: round(impulseAmount),
      transactionCount: Number(summary.impulseCount),
      percentageOfExpense: percentage(impulseAmount, totalExpense),
    },

    expenseByCategory,
    incomeByCategory,
    topCategory: expenseByCategory[0] ?? null,

    topMerchants: merchantRows.map(row => ({
      merchant: row.merchant,
      amount: round(toNumber(row.amount)),
      transactionCount: Number(row.transactionCount),
      percentage: percentage(toNumber(row.amount), totalExpense),
    })),

    timeSeries,

    patterns: {
      byDayOfWeek,
      busiestDay,
      busiestPeriod: busiestPeriod && busiestPeriod.expense > 0 ? busiestPeriod : null,
      peakHour: peakHour
        ? {
            hourOfDay: peakHour.hourOfDay,
            amount: round(toNumber(peakHour.amount)),
            transactionCount: Number(peakHour.transactionCount),
          }
        : null,
    },
  };
};
