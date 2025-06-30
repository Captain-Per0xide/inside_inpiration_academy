/**
 * Test Date Utility
 * 
 * This utility provides a centralized way to control the current date
 * for testing purposes. Set TEST_MODE to true to use a fixed test date,
 * or false to use the real current date.
 */

// Set this to true to use test date, false for real date
const TEST_MODE = true;

// Test date: September 15, 2025
const TEST_DATE = new Date(2025, 9, 15); // Month is 0-indexed, so 8 = September

/**
 * Get the current date (test date if TEST_MODE is true, otherwise real date)
 */
export const getCurrentDate = (): Date => {
  if (TEST_MODE) {
    return new Date(TEST_DATE);
  }
  return new Date();
};

/**
 * Get the current month name
 */
export const getCurrentMonthName = (): string => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
  ];
  return months[getCurrentDate().getMonth()];
};

/**
 * Get the current year
 */
export const getCurrentYear = (): number => {
  return getCurrentDate().getFullYear();
};

/**
 * Get ISO string for current date
 */
export const getCurrentISOString = (): string => {
  return getCurrentDate().toISOString();
};

/**
 * Get date string in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  return getCurrentDate().toISOString().split('T')[0];
};

/**
 * Get current month and year for display
 */
export const getCurrentMonthYear = (): string => {
  return `${getCurrentMonthName()} ${getCurrentYear()}`;
};

/**
 * Toggle test mode (for debugging purposes)
 */
export const toggleTestMode = (): boolean => {
  // This would require changing the constant, so just return current state
  return TEST_MODE;
};

/**
 * Check if we're in test mode
 */
export const isTestMode = (): boolean => {
  return TEST_MODE;
};
