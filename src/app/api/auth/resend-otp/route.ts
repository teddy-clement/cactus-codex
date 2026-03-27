import { NextRequest, NextResponse } from 'next/server'
import { generateOTP, storeOTP, getUserByEmail } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const user = await getUserByEmail(email)
  if (!user) return NextResponse.json({ success: true }) // Silencieux

  const otp = generateOTP()
  await storeOTP(email, otp)
  await sendOTPEmail(email, otp, user.name)

  return NextResponse.json({ success: true })
}
