import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export function signAccessToken(payload: object) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload
}
