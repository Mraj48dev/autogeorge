import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/shared/middleware/authorization';
import { createUserManagementContainer } from '@/composition-root/container';
import { auth } from '@clerk/nextjs/server';
import { UserRoleType } from '@/modules/user-management/domain/value-objects/UserRole';

/**
 * POST /api/admin/users/invite
 * Invia un invito via email per creare un nuovo utente
 * Protected: Requires 'users:manage' permission
 */
const inviteUserHandler = async (request: NextRequest) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role, message } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRoleType).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    const { userManagementFacade } = createUserManagementContainer();

    // Check if user already exists
    const existingUsersResult = await userManagementFacade.getUsers({
      requestedBy: userId,
      limit: 1,
      page: 1
    });

    if (existingUsersResult.isSuccess()) {
      const existingUser = existingUsersResult.value.users.find(u => u.email === email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // For now, we'll create a mock invitation
    // In a real implementation, you would:
    // 1. Generate an invitation token
    // 2. Send an email with the invitation link
    // 3. Store the invitation in a database table

    const invitationToken = `invite_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const invitationLink = `${process.env.NEXTAUTH_URL || 'https://autogeorge.vercel.app'}/auth/accept-invitation?token=${invitationToken}`;

    // Mock email sending
    console.log(`
      =========================================
      📧 MOCK EMAIL INVITATION
      =========================================
      To: ${email}
      Subject: Invito ad AutoGeorge

      Sei stato invitato ad utilizzare AutoGeorge con il ruolo di ${role}.

      ${message || 'Benvenuto nel team!'}

      Clicca qui per accettare l'invito:
      ${invitationLink}

      L'invito scadrà tra 7 giorni.
      =========================================
    `);

    // In a real implementation, you would save the invitation to database:
    // await saveInvitation({
    //   email,
    //   role,
    //   token: invitationToken,
    //   invitedBy: userId,
    //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    //   message
    // });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation: {
        email,
        role,
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitationLink: invitationLink
      }
    });

  } catch (error) {
    console.error('Invite user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// Apply authorization middleware
export const POST = AuthMiddleware.usersManage(inviteUserHandler);