/**
 * SESSION KEEPER INTEGRATION GUIDE
 * 
 * Add this to your main App.js or root component to prevent session timeout
 */

/*
// 1. Import the hook at the top of your main App component
import { useSessionKeeper } from './hooks/useSessionKeeper';

// 2. Add this inside your main App component function
export default function App() {
  // Initialize session keeper
  const { startSessionKeeper, stopSessionKeeper, refreshSession } = useSessionKeeper();

  // Your existing app code...
  
  return (
    // Your existing JSX...
  );
}
*/

/*
 * ALTERNATIVE: Manual Integration
 * 
 * If you prefer manual control, add this to any component where user logs in:

import sessionKeeper from './utils/sessionKeeper';

// After successful login:
const handleLoginSuccess = async (userData, sessionToken) => {
  // Save to AsyncStorage (your existing code)
  await AsyncStorage.setItem('userData', JSON.stringify(userData));
  await AsyncStorage.setItem('sessionToken', sessionToken);
  
  // Start session keeper
  await sessionKeeper.start();
  
  // Navigate to main app
};

// On logout:
const handleLogout = async () => {
  // Stop session keeper
  sessionKeeper.stop();
  
  // Clear AsyncStorage (your existing code)
  await AsyncStorage.removeItem('userData');
  await AsyncStorage.removeItem('sessionToken');
  
  // Navigate to login
};
*/

/**
 * WHAT THIS DOES:
 * 
 * 1. Backend (verify_session.php):
 *    - Every API call automatically extends session by 24 hours
 *    - No more unexpected logouts during active use
 * 
 * 2. Frontend (sessionKeeper):
 *    - Pings server every 10 minutes to keep session alive
 *    - Handles app backgrounding/foregrounding
 *    - Automatically stops if session becomes invalid
 * 
 * 3. Manual refresh endpoint:
 *    - /api/auth/refresh_session.php for explicit session extension
 *    - Returns new expiry time and updated user data
 * 
 * RESULT: No more session timeouts while user is active!
 */
