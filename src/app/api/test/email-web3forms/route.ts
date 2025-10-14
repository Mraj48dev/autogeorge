import { NextRequest, NextResponse } from 'next/server';

/**
 * TEST Endpoint - Web3Forms Direct Test
 * Simple test to verify Web3Forms is working
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Testing Web3Forms directly...');

    if (!process.env.WEB3FORMS_ACCESS_KEY) {
      return NextResponse.json({
        success: false,
        error: 'WEB3FORMS_ACCESS_KEY not configured'
      });
    }

    const formData = new FormData();
    formData.append('access_key', process.env.WEB3FORMS_ACCESS_KEY);
    formData.append('subject', '🧪 AutoGeorge Web3Forms Test Email');
    formData.append('from_name', 'AutoGeorge Test');
    formData.append('from_email', 'ale.sandrotaurino@gmail.com');
    formData.append('to_email', 'alessandro.taurino900@gmail.com');
    formData.append('message', 'Questo è un test per verificare che Web3Forms funzioni correttamente con AutoGeorge.');
    formData.append('html', `
      <h1>🧪 Test Email AutoGeorge</h1>
      <p>Se ricevi questa email, <strong>Web3Forms funziona perfettamente!</strong></p>
      <p>Timestamp: ${new Date().toLocaleString('it')}</p>
      <hr>
      <small>AutoGeorge Email Test System</small>
    `);

    console.log('📧 Sending test email via Web3Forms...');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    console.log('📧 Web3Forms response:', result);

    if (result.success) {
      console.log('✅ Test email sent successfully via Web3Forms!');
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        web3forms_response: result,
        instruction: 'Check alessandro.taurino900@gmail.com inbox (and spam folder)'
      });
    } else {
      console.log('❌ Web3Forms test failed:', result);
      return NextResponse.json({
        success: false,
        error: 'Web3Forms test failed',
        web3forms_response: result
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}