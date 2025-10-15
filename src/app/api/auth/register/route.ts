import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import bcrypt from 'bcryptjs';

/**
 * User Registration with Password
 * POST /api/auth/register
 * Crea nuovo utente con password hash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Controlla se l'utente esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crea nuovo utente (emailVerified = null, deve verificare)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        emailVerified: null, // Non verificato inizialmente
      },
    });

    console.log('✅ User registered:', user.email);

    // Ora l'utente può usare NextAuth per il login passwordless con verifica email
    return NextResponse.json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      instructions: [
        'Go to /auth/signin',
        'Use "Sign in with Email" (passwordless)',
        'Or use "Sign in with Credentials" after email verification'
      ]
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}