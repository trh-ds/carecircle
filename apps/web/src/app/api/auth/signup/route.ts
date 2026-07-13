import db from '@/lib/db' // must export a mysql2/promise pool
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/JWT'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password, phone, full_name, preferred_language } = await req.json()

  if (!email || !password || !full_name || !phone || !preferred_language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
  if (Array.isArray(rows) && rows.length > 0) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const hashed = await hashPassword(password)

  const [result] = await db.execute(
    `INSERT INTO users (email, phone, full_name, preferred_language, metadata, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, phone, full_name, preferred_language, null, hashed]
  )

  const insertedId = (result as any).insertId
  const user = { id: insertedId, email }

  const token = signToken({ userId: user.id, email: user.email })

  const response = NextResponse.json(
    { user: { id: user.id, email: user.email } },
    { status: 201 }
  )

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, 
  })

  return response
}