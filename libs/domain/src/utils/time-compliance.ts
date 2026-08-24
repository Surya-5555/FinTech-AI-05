export function isOutsideTRAIWindow(now: Date): boolean {
  // Convert UTC Date to IST (+5:30) which is +330 minutes
  const istTime = new Date(now.getTime() + 330 * 60000);
  
  // getUTCHours() is used because we've manually shifted the epoch by the IST offset
  const istHour = istTime.getUTCHours();
  
  // TRAI compliance allows contacting customers strictly between 09:00 AM and 08:00 PM (20:00)
  // Therefore, outside the window means istHour < 9 or istHour >= 20
  if (istHour < 9 || istHour >= 20) {
    return true;
  }
  
  return false;
}
