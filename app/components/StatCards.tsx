import { useState } from "react";
import { Link } from "@remix-run/react";
import type { DashboardStats } from "~/lib/dashboard.js";
import { cardStyles } from "~/utils/tw-styles.js";

interface StatCardsProps {
  stats: DashboardStats;
}

export default function StatCards({ stats }: StatCardsProps) {
  const [rfqPeriod, setRfqPeriod] = useState("30");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getMonthOverMonthPercentage = (current: number, previous: number) => {
    if (previous === 0) return "+100%";
    const percentage = ((current - previous) / previous) * 100;
    return percentage > 0
      ? `+${percentage.toFixed(0)}%`
      : `${percentage.toFixed(0)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-10 py-8">
      <Link
        to="/ActionItems"
        className="no-underline"
      >
        <div className={`${cardStyles.container} cursor-pointer h-full flex flex-col`}>
          <h4 className={cardStyles.subtitle}>Action Items</h4>
          <h1 className={cardStyles.title}>{stats.actionItems}</h1>
          <p className={cardStyles.content}>Requires review</p>
        </div>
      </Link>
      <div
        className={`${cardStyles.container} h-full flex flex-col`}
      >
        <h4 className={cardStyles.subtitle}>Open PO Revenue</h4>
        <h1 className={cardStyles.title}>
          {formatCurrency(stats.openPoRevenue)}
        </h1>
        <p className={cardStyles.content}>+81% month over month</p>
      </div>
      <Link
        to="/orders"
        className="no-underline"
      >
        <div className={`${cardStyles.container} cursor-pointer h-full flex flex-col`}>
          <h4 className={cardStyles.subtitle}>Open PO's</h4>
          <h1 className={cardStyles.title}>{stats.openPOs}</h1>
          <p className={cardStyles.content}>+33% month over month</p>
        </div>
      </Link>
      <div
        className={`${cardStyles.container} h-full flex flex-col`}
      >
        <h4 className={cardStyles.subtitle}>RFQ's</h4>
        <h1 className={cardStyles.title}>{stats.rfqs}</h1>
        <div className="flex items-center gap-2">
          <p className={cardStyles.content}>In the Last:</p>
          <select
            value={rfqPeriod}
            onChange={(e) => setRfqPeriod(e.target.value)}
            className="font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          >
            <option value="30">30 Days</option>
            <option value="14">14 Days</option>
            <option value="7">7 Days</option>
            <option value="1">Today</option>
          </select>
        </div>
      </div>
    </div>
  );
}
