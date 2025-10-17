import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Authorized emails - ONLY these users can access the system
const AUTHORIZED_EMAILS = [
  'mraj48bis@gmail.com',
  'ale.sandrotaurino@gmail.com',
  'alessandro.taurino900@gmail.com'
];

export async function verifyAdminAccess() {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Authentication required',
            message: 'You must be signed in to access this endpoint'
          },
          { status: 401 }
        )
      };
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    if (!userEmail || !AUTHORIZED_EMAILS.includes(userEmail)) {
      console.error(`🚨 SECURITY ALERT: Unauthorized API access attempt by ${userEmail || 'unknown'}`);

      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Access denied',
            message: 'Your account is not authorized to access this system',
            email: userEmail,
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        )
      };
    }

    console.log(`✅ Authorized API access: ${userEmail}`);

    return {
      authorized: true,
      user,
      userEmail
    };

  } catch (error) {
    console.error('❌ Admin auth verification error:', error);

    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Authentication error',
          message: 'Failed to verify user authorization'
        },
        { status: 500 }
      )
    };
  }
}