import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Verify Email - SISTEMA SEMPLICE CHE FUNZIONA
 * POST /api/auth/verify-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Email verification attempt for token:', token);

    // Trova il token di verifica nel database
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification) {
      console.log('❌ Token not found:', token);
      return NextResponse.json(
        { success: false, message: 'Token di verifica non valido' },
        { status: 400 }
      );
    }

    // Controlla se il token è scaduto
    if (verification.expiresAt < new Date()) {
      console.log('❌ Token expired:', token);
      return NextResponse.json(
        { success: false, message: 'Token di verifica scaduto' },
        { status: 400 }
      );
    }

    // Trova l'utente e verifica l'email
    const user = await prisma.user.findUnique({
      where: { email: verification.email }
    });

    if (!user) {
      console.log('❌ User not found for email:', verification.email);
      return NextResponse.json(
        { success: false, message: 'Utente non trovato' },
        { status: 400 }
      );
    }

    // Aggiorna l'utente: verifica email
    await prisma.user.update({
      where: { email: verification.email },
      data: { emailVerified: new Date() }
    });

    // Aggiorna lo stato del token
    await prisma.emailVerification.update({
      where: { token },
      data: {
        status: 'verified',
        verifiedAt: new Date()
      }
    });

    console.log('✅ Email verified successfully for:', verification.email);

    return NextResponse.json({
      success: true,
      message: 'Email verificata con successo! Ora puoi accedere.',
      email: verification.email,
      userId: user.id
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Errore interno del server. Riprova.',
      },
      { status: 500 }
    );
  }
}

/**
 * Verify Email via GET (for direct link access)
 * GET /api/auth/verify-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('❌ Missing token in GET request');
      const errorUrl = new URL('/auth/verify-email?error=missing_token', request.url);
      return NextResponse.redirect(errorUrl);
    }

    console.log('🔍 GET Email verification attempt for token:', token);

    // Trova il token di verifica nel database
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification) {
      console.log('❌ Token not found:', token);
      const errorUrl = new URL('/auth/verify-email?error=invalid_token', request.url);
      return NextResponse.redirect(errorUrl);
    }

    // Controlla se il token è scaduto
    if (verification.expiresAt < new Date()) {
      console.log('❌ Token expired:', token);
      const errorUrl = new URL('/auth/verify-email?error=expired_token', request.url);
      return NextResponse.redirect(errorUrl);
    }

    // Trova l'utente e verifica l'email
    const user = await prisma.user.findUnique({
      where: { email: verification.email }
    });

    if (!user) {
      console.log('❌ User not found for email:', verification.email);
      const errorUrl = new URL('/auth/verify-email?error=user_not_found', request.url);
      return NextResponse.redirect(errorUrl);
    }

    // Aggiorna l'utente: verifica email
    await prisma.user.update({
      where: { email: verification.email },
      data: { emailVerified: new Date() }
    });

    // Aggiorna lo stato del token
    await prisma.emailVerification.update({
      where: { token },
      data: {
        status: 'verified',
        verifiedAt: new Date()
      }
    });

    console.log('✅ GET Email verified successfully for:', verification.email);

    // Redirect to success page
    const successUrl = new URL('/auth/verify-email?success=true&email=' + encodeURIComponent(verification.email), request.url);
    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('❌ GET Email verification error:', error);
    const errorUrl = new URL('/auth/verify-email?error=server_error', request.url);
    return NextResponse.redirect(errorUrl);
  }
}