import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vendix_token') : null
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: token ? { token } : {},
      autoConnect: true,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
