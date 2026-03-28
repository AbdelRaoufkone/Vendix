'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Send, Loader2, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface Props {
  open: boolean
  onClose: () => void
  boutiqueId: string
  boutiqueName: string
  themeColor?: string
}

interface Message {
  id?: string
  content: string
  senderType: 'CUSTOMER' | 'MERCHANT'
  createdAt?: string
}

const identitySchema = z.object({
  name: z.string().min(2, 'Le nom est requis'),
  phone: z.string().min(6, 'Le téléphone est requis'),
})

type IdentityValues = z.infer<typeof identitySchema>

export function ChatWidget({ open, onClose, boutiqueId, boutiqueName, themeColor }: Props) {
  const color = themeColor || '#6366f1'
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdentityValues>({ resolver: zodResolver(identitySchema) })

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Socket : rejoindre la conversation et écouter les messages
  useEffect(() => {
    if (!conversationId || !open) return
    const socket = getSocket()
    socket.emit('join:conversation', { conversationId })

    const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg])
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.emit('leave:conversation', { conversationId })
      socket.off('message:new', handleNewMessage)
    }
  }, [conversationId, open])

  const onIdentify = async (values: IdentityValues) => {
    setIdentifying(true)
    setApiError(null)
    try {
      const { data } = await api.post('/messages/conversations', {
        boutiqueId,
        customer: { name: values.name, phone: values.phone },
      })
      setConversationId(data.conversation.id)
      setMessages(data.conversation.messages ?? [])
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? 'Impossible de démarrer la conversation.')
    } finally {
      setIdentifying(false)
    }
  }

  const handleSend = () => {
    if (!messageText.trim() || !conversationId) return
    const socket = getSocket()
    const optimistic: Message = {
      content: messageText.trim(),
      senderType: 'CUSTOMER',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    socket.emit('message:send', {
      conversationId,
      content: messageText.trim(),
      senderType: 'CUSTOMER',
    })
    setMessageText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend()
  }

  const handleClose = () => {
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-center sm:justify-end sm:p-4">
      {/* Overlay mobile */}
      <div className="absolute inset-0 bg-black bg-opacity-40 sm:hidden" onClick={handleClose} />

      {/* Widget */}
      <div className="relative w-full sm:w-96 h-full sm:h-[560px] bg-white flex flex-col sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: color }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: `${color}cc` }}>
            {boutiqueName[0]?.toUpperCase() ?? 'B'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{boutiqueName}</p>
            <p className="text-xs text-indigo-200">En ligne</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-indigo-500 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        {!conversationId ? (
          /* Formulaire d'identification */
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="text-center mb-6">
              <MessageCircle size={40} className="text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Démarrer une conversation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Identifiez-vous pour contacter {boutiqueName}
              </p>
            </div>

            <form onSubmit={handleSubmit(onIdentify)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre nom
                </label>
                <input
                  type="text"
                  placeholder="Prénom Nom"
                  {...register('name')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  {...register('phone')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>

              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={identifying}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-60 transition-colors"
                style={{ backgroundColor: color }}
              >
                {identifying && <Loader2 size={16} className="animate-spin" />}
                Commencer le chat
              </button>
            </form>
          </div>
        ) : (
          /* Interface de chat */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">
                  Envoyez votre premier message !
                </p>
              )}
              {messages.map((msg, idx) => {
                const isCustomer = msg.senderType === 'CUSTOMER'
                return (
                  <div
                    key={msg.id ?? idx}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        isCustomer
                          ? 'text-white rounded-br-sm'
                          : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                      }`}
                    style={isCustomer ? { backgroundColor: color } : {}}
                    >
                      <p>{msg.content}</p>
                      {msg.createdAt && (
                        <p
                          className={`text-xs mt-1 ${
                            isCustomer ? 'text-indigo-200' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Saisie */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="p-2.5 text-white rounded-xl disabled:opacity-40 transition-colors"
              style={{ backgroundColor: color }}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
