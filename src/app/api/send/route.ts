import { NextRequest, NextResponse } from 'next/server';
import { EmailTemplate } from '../../../components/EmailTemplate';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, firstName } = await req.json();
    const { data, error } = await resend.emails.send({
      from: 'Bitbash <onboarding@bitbash.dev>',
      to: [to],
      subject: 'Hello world',
      react: EmailTemplate({ firstName }),
    });

    if (error) {
      return NextResponse.json(error, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
