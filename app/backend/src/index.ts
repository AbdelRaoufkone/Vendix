import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { logger, morganStream } from './lib/logger'

import { authRouter } from './routes/auth.routes'
import { boutiqueRouter } from './routes/boutique.routes'
import { productRouter } from './routes/product.routes'
import { orderRouter } from './routes/order.routes'
import { customerRouter } from './routes/customer.routes'
import { supplierRouter } from './routes/supplier.routes'
import { messageRouter } from './routes/message.routes'
import { statsRouter } from './routes/stats.routes'
import { categoryRouter } from './routes/category.routes'
import { employeeRouter } from './routes/employee.routes'
import { paymentRouter } from './routes/payment.routes'
import { initSocketHandlers } from './socket/chat.socket'
import { errorHandler } from './middleware/error.middleware'
import { rateLimiter } from './middleware/rateLimit.middleware'

dotenv.config()

const app = express()
const server = http.createServer(app)

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(morgan(
  ':remote-addr :method :url :status :res[content-length]B :response-time ms',
  { stream: morganStream }
))
app.use(rateLimiter)

// Routes
app.use('/api/auth', authRouter)
app.use('/api/boutiques', boutiqueRouter)
app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)
app.use('/api/customers', customerRouter)
app.use('/api/suppliers', supplierRouter)
app.use('/api/messages', messageRouter)
app.use('/api/stats', statsRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/employees', employeeRouter)
app.use('/api/payments', paymentRouter)

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }))

// Socket handlers
initSocketHandlers(io)

// Error handler (doit être en dernier)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  logger.info(`VENDIX API running on port ${PORT}`, {
    env: process.env.NODE_ENV,
    pid: process.pid,
  })
})

export { io }
