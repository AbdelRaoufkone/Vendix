'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Image, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { timeAgo } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'
import { useNotificationStore } from '@/store/notification.store'

export default function MessagesPage() {
  const boutiqueId = useBoutiqueId()
  const clearMessages = useNotificationStore(s => s.clearMessages)

  useEffect(() => { clearMessages() }, [])
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const socket = getSocket()

  const { data: conversations } = useQuery({
    queryKey: ['conversations', boutiqueId],
    queryFn: () => api.get(`/messages/conversations?boutiqueId=${boutiqueId}`).then(r => r.data.conversations),
    enabled: !!boutiqueId,
    refetchInterval: 10_000,
  })

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConv],
    queryFn: () => api.get(`/messages/conversations/${selectedConv}/messages`).then(r => r.data.messages),
    enabled: !!selectedConv,
  })

  // Socket temps réel
  useEffect(() => {
    if (!selectedConv) return
    socket.emit('join:conversation', { conversationId: selectedConv })

    socket.on('message:new', (msg) => {
      queryClient.setQueryData(['messages', selectedConv], (old: any[] = []) => [...old, msg])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    return () => {
      socket.emit('leave:conversation', { conversationId: selectedConv })
      socket.off('message:new')
    }
  }, [selectedConv])

  // Scroll automatique en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      socket.emit('message:send', {
        conversationId: selectedConv,
        content,
        senderType: 'MERCHANT',
      }),
    onSuccess: () => setMessage(''),
  })

  const handleSend = () => {
    if (!message.trim() || !selectedConv) return
    sendMutation.mutate(message.trim())
    setMessage('')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* Liste conversations */}
      <div className="w-80 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations?.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left transition-colors ${
                selectedConv === conv.id ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                {(conv.customer?.name || conv.supplier?.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {conv.customer?.name || conv.supplier?.name || 'Inconnu'}
                  </p>
                  <span className="text-xs text-gray-400">
                    {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {conv.messages?.[0]?.content || 'Aucun message'}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
          {!conversations?.length && (
            <div className="p-8 text-center text-gray-400 text-sm">Aucune conversation</div>
          )}
        </div>
      </div>

      {/* Zone chat */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages?.map((msg: any) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Réponses rapides */}
          <div className="px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => setMessage(reply)}
                className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-indigo-100 hover:text-indigo-700"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Saisie */}
          <div className="p-4 border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Écrire un message..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <ShoppingBag size={40} className="mx-auto mb-2 opacity-20" />
            <p>Sélectionnez une conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: any }) {
  const isMerchant = message.senderType === 'MERCHANT'
  return (
    <div className={`flex ${isMerchant ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
        isMerchant
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
      }`}>
        {message.type === 'IMAGE' ? (
          <img src={message.content} alt="" className="rounded-lg max-w-full" />
        ) : (
          <p>{message.content}</p>
        )}
        <p className={`text-xs mt-1 ${isMerchant ? 'text-indigo-200' : 'text-gray-400'}`}>
          {timeAgo(message.createdAt)}
          {isMerchant && message.readAt && ' · Lu'}
        </p>
      </div>
    </div>
  )
}

const QUICK_REPLIES = [
  'Commande reçue, merci !',
  'En cours de préparation 🔄',
  'Prêt pour la livraison 🚀',
  'Livré ✅',
  'Rupture de stock, désolé',
  'Quel est votre adresse ?',
]
