import { NextRequest, NextResponse } from 'next/server';

// Simple admin token - change this immediately after security fix
const ADMIN_TOKEN = 'autogeorge-admin-2025-security-token';

// Authorized emails
const AUTHORIZED_EMAILS = [
  'mraj48bis@gmail.com',
  'ale.sandrotaurino@gmail.com',
  'alessandro.taurino900@gmail.com'
];

export function verifySimpleAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminToken = request.headers.get('x-admin-token');
  const userEmail = request.headers.get('x-user-email');

  // Check for admin token
  if (adminToken === ADMIN_TOKEN && userEmail && AUTHORIZED_EMAILS.includes(userEmail)) {
    console.log(`✅ Authorized API access: ${userEmail}`);
    return { authorized: true, userEmail };
  }

  console.error(`🚨 SECURITY ALERT: Unauthorized API access attempt. Token: ${adminToken}, Email: ${userEmail}`);

  return {
    authorized: false,
    response: NextResponse.json(
      {
        error: 'Access denied',
        message: 'Invalid authorization credentials',
        required: 'x-admin-token and x-user-email headers required',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    )
  };
}

export { ADMIN_TOKEN, AUTHORIZED_EMAILS };