export function filterByWeek(transactions: any[], year: number, week: number): any[] {
  const now = new Date();
  const currentDate = now.getDate();
  const currentDay = now.getDay();
  
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(currentDate - currentDay);
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
  endOfCurrentWeek.setHours(23, 59, 59, 999);
  
  return transactions.filter((t: any) => {
    const tDate = new Date(t.transactionDate);
    return tDate >= startOfCurrentWeek && tDate <= endOfCurrentWeek;
  });
}

export function filterByMonth(transactions: any[], year: number, month: number): any[] {
  return transactions.filter((t: any) => {
    const tDate = new Date(t.transactionDate);
    return tDate.getFullYear() === year && tDate.getMonth() === month - 1;
  });
}

export function filterByYear(transactions: any[], year: number): any[] {
  return transactions.filter((t: any) => {
    const tDate = new Date(t.transactionDate);
    return tDate.getFullYear() === year;
  });
}

export function filterTransactionsByPeriod(transactions: any[], periodStr: string): any[] {
  if (!periodStr) {
    return transactions;
  }

  if (periodStr === 'week') {
    const now = new Date();
    const currentDate = now.getDate();
    const currentDay = now.getDay();
    
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(currentDate - currentDay);
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
    endOfCurrentWeek.setHours(23, 59, 59, 999);
    
    console.log(`[Filter Week] Start: ${startOfCurrentWeek.toISOString()}, End: ${endOfCurrentWeek.toISOString()}`);
    
    const filtered = transactions.filter((t: any) => {
      const tDate = new Date(t.transactionDate);
      const isInRange = tDate >= startOfCurrentWeek && tDate <= endOfCurrentWeek;
      if (isInRange) {
        console.log(`[Filter Week] Transaction found: ${t.id}, date: ${tDate.toISOString()}, amount: ${t.amount}`);
      }
      return isInRange;
    });
    
    console.log(`[Filter Week] Total: ${transactions.length}, Filtered: ${filtered.length}`);
    return filtered;
  } else if (periodStr.includes('-W')) {
    const [yearStr, weekStr] = periodStr.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    return filterByWeek(transactions, year, week);
  } else if (periodStr.includes('-')) {
    const [yearStr, monthStr] = periodStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    return filterByMonth(transactions, year, month);
  } else {
    const year = parseInt(periodStr);
    console.log(`[Filter Year] Year: ${year}, Total transactions: ${transactions.length}`);
    const filtered = transactions.filter((t: any) => {
      const tDate = new Date(t.transactionDate);
      const isInYear = tDate.getFullYear() === year;
      if (isInYear) {
        console.log(`[Filter Year] Transaction found: ${t.id}, date: ${tDate.toISOString()}, year: ${tDate.getFullYear()}, amount: ${t.amount}`);
      }
      return isInYear;
    });
    console.log(`[Filter Year] Filtered: ${filtered.length}`);
    return filtered;
  }
}

