import JWT from 'jsonwebtoken'

const JWT_SECRET = process.env.TOKEN_SECRET!

export type SessionPayload = {
    userId: string,
    email: string
}

export function signToken(payload: SessionPayload) {
    return JWT.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionPayload | null {
    try {
        return JWT.verify(token, JWT_SECRET) as SessionPayload
    } catch {
        return null;
    }
}