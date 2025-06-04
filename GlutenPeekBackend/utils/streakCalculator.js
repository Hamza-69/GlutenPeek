const Symptom = require('../models/symptom');
const Scan = require('../models/scan');

async function calculateStreak(userId) {
  if (!userId) {
    return 0; // Or throw an error, depending on desired behavior
  }

  // 3. Fetch Activity Dates
  const symptomEntries = await Symptom.find({ userId }).select('date').sort({ date: -1 }).lean();
  const scanEntries = await Scan.find({ userId }).select('date').sort({ date: -1 }).lean();

  // 4. Normalize and Unify Dates
  const allNormalizedDates = [];
  symptomEntries.forEach(entry => {
    allNormalizedDates.push(new Date(entry.date).toISOString().split('T')[0]);
  });
  scanEntries.forEach(entry => {
    allNormalizedDates.push(new Date(entry.date).toISOString().split('T')[0]);
  });

  if (allNormalizedDates.length === 0) {
    return 0;
  }

  // Create a Set for unique dates and sort them. Sorting here is important.
  // Sorting in descending order (most recent first)
  const uniqueActivityDates = [...new Set(allNormalizedDates)].sort((a, b) => b.localeCompare(a));

  // 5. Iterate and Count Consecutive Days
  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of UTC day

  let currentCheckDate = new Date(today); // Start checking from today (UTC)

  for (let i = 0; i < uniqueActivityDates.length; i++) {
    const normalizedCheckDateStr = currentCheckDate.toISOString().split('T')[0];

    // Check if the user had activity on the day we are currently checking
    if (uniqueActivityDates.includes(normalizedCheckDateStr)) {
      streak++;
      // Move to the previous day for the next iteration
      currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1);
    } else {
      // If the currentCheckDate (e.g., yesterday) is NOT in uniqueActivityDates,
      // but today WAS, the streak is broken *after* today.
      // However, if today itself is not in uniqueActivityDates, streak remains 0.
      // If today was an activity day, and yesterday was not, the streak is 1.
      // The loop should break if the *expected* day (currentCheckDate) is not found.

      // If the first date we check (today) is not in activities, streak is 0 and we break.
      // If today is in activities (streak=1), we then check for yesterday.
      // If yesterday is not in activities, streak remains 1 and we break.
      if (i === 0 && normalizedCheckDateStr !== uniqueActivityDates[0]) {
        // This means today was not an activity day, so streak is 0.
        // (or the most recent activity was not today)
        // If today had no activity, the loop for checking `uniqueActivityDates`
        // against `currentCheckDate` (starting from today) might not correctly
        // initialize the streak if the most recent activity was in the past.
        // Let's refine the loop:
        // The current logic iterates through actual activity dates.
        // We need to check if `today` is an activity day, then `yesterday`, etc.

        // Corrected logic:
        // Handled by the loop structure below.
        break;
      }
    }
  }

  // Refined streak calculation loop:
  // Start from today and check backwards.
  streak = 0; // Reset streak for the refined loop
  currentCheckDate = new Date(today); // Ensure currentCheckDate starts from today UTC

  // It's possible the user's latest activity was not today.
  // We need to find the first day of activity. If it's not today or yesterday (consecutively), the streak is 1 (for that day) or 0.

  // Let's check if today is an activity day.
  const todayStr = today.toISOString().split('T')[0];

  if (!uniqueActivityDates.includes(todayStr)) {
      // If today has no activity, check if yesterday had activity.
      // If so, streak is 1 (for yesterday). If not, streak is 0.
      // This needs to be handled carefully if the most_recent_activity_date is not today.
      // The problem asks for *consecutive* days ending today.
      // So, if today has no activity, streak is 0.
      return 0;
  }

  // If we reach here, today IS an activity day.
  streak = 1;
  currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1); // Move to yesterday

  // Now, loop to check for consecutive days prior to today.
  for (let i = 1; i < uniqueActivityDates.length + 1 ; i++) { // Iterate enough times to cover all possible consecutive days
      const normalizedPriorDateStr = currentCheckDate.toISOString().split('T')[0];
      if (uniqueActivityDates.includes(normalizedPriorDateStr)) {
          streak++;
          currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1); // Move to the day before
      } else {
          // Streak broken
          break;
      }
  }
  return streak;
}

module.exports = { calculateStreak };

