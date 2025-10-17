import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Authorized emails - ONLY these users can access the system
const AUTHORIZED_EMAILS = [
  'mraj48bis@gmail.com',
  'ale.sandrotaurino@gmail.com',
  'alessandro.taurino900@gmail.com'
];

export function useAuthorizedUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      // If not signed in, redirect to sign-in
      if (!isSignedIn) {
        router.push('/sign-in');
        return;
      }

      // Check if user email is authorized
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;

      if (userEmail && !AUTHORIZED_EMAILS.includes(userEmail)) {
        console.error(`🚨 SECURITY ALERT: Unauthorized access attempt by ${userEmail}`);

        // Redirect to unauthorized page or sign out
        alert(`Access Denied\n\nYour account (${userEmail}) is not authorized to access this system.\n\nPlease contact the administrator.`);
        router.push('/sign-in');
        return;
      }

      console.log(`✅ Authorized access: ${userEmail}`);
    }
  }, [isLoaded, isSignedIn, user, router]);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const isAuthorized = userEmail && AUTHORIZED_EMAILS.includes(userEmail);

  return {
    isLoaded,
    isSignedIn,
    user,
    userEmail,
    isAuthorized,
    isLoading: !isLoaded
  };
}