import React, { useState, useRef } from 'react';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  type: 'employee' | 'support';
  online: boolean;
}

// Mock data
const mockChats: Chat[] = [
  { id: '1', name: 'João Silva', avatar: 'https://i.pravatar.cc/150?u=1', lastMessage: 'Os relatórios estão prontos.', time: '10:30', unread: 2, type: 'employee', online: true },
  { id: '2', name: 'Maria Souza', avatar: 'https://i.pravatar.cc/150?u=2', lastMessage: 'Preciso de ajuda com o sistema.', time: '09:15', unread: 0, type: 'support', online: false },
  { id: '3', name: 'Carlos Santos', avatar: 'https://i.pravatar.cc/150?u=3', lastMessage: 'Reunião às 14h.', time: 'Ontem', unread: 0, type: 'employee', online: true },
  { id: '4', name: 'Suporte Cliente A', avatar: 'https://i.pravatar.cc/150?u=4', lastMessage: 'Obrigado pelo retorno.', time: 'Ontem', unread: 0, type: 'support', online: false },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1', senderId: '1', text: 'Bom dia! Como estão as coisas?', timestamp: '10:00', isMine: false, type: 'text' },
    { id: 'm2', senderId: 'me', text: 'Tudo bem! Trabalhando no novo layout.', timestamp: '10:05', isMine: true, type: 'text' },
    { id: 'm3', senderId: '1', text: 'Os relatórios estão prontos.', timestamp: '10:30', isMine: false, type: 'text' },
  ]
};

export const ChatScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'employee' | 'support'>('all');
  const [selectedChat, setSelectedChat] = useState<string | null>('1');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const emojis = ['😀', '😂', '😍', '🙏', '👍', '🙌', '🔥', '🎉', '💡', '✅'];

  const filteredChats = mockChats.filter(chat => activeTab === 'all' || chat.type === activeTab);
  const currentChat = mockChats.find(c => c.id === selectedChat);
  const currentMessages = selectedChat ? (messages[selectedChat] || []) : [];

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    setIsMobileChatOpen(true);
  };

  const handleBackToChatList = () => {
    setIsMobileChatOpen(false);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() && !fileInputRef.current?.files?.length) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      type: 'text'
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat!]: [...(prev[selectedChat!] || []), newMessage]
    }));
    setMessageText('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: isImage ? 'Imagem enviada' : `Arquivo: ${file.name}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      type: isImage ? 'image' : 'file',
      fileUrl,
      fileName: file.name
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMessage]
    }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full min-h-[600px] bg-bg-surface rounded-3xl overflow-hidden border border-border-main shadow-sm transition-colors duration-200 relative">
      {/* Chat List Sidebar */}
      <div className={`
        w-full md:w-80 border-r border-border-main flex flex-col bg-bg-base transition-colors duration-200
        absolute md:static inset-0 z-10 md:z-auto
        ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-border-main">
          <h2 className="text-xl font-bold text-text-main mb-4">Mensagens</h2>
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full pl-9 pr-4 py-2 bg-bg-surface border border-border-main rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-text-main"
            />
          </div>
        </div>
        
        <div className="flex p-2 gap-1 border-b border-border-main">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'all' ? 'bg-bg-surface text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-surface hover:text-primary'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setActiveTab('employee')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'employee' ? 'bg-bg-surface text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-surface hover:text-primary'}`}
          >
            Equipe
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'support' ? 'bg-bg-surface text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-surface hover:text-primary'}`}
          >
            Suporte
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {filteredChats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => handleChatSelect(chat.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-border-main last:border-0 ${selectedChat === chat.id ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}`}
            >
              <div className="relative">
                <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-bg-surface rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`font-medium text-sm truncate ${selectedChat === chat.id ? 'text-primary' : 'text-text-main'}`}>{chat.name}</h3>
                  <span className="text-[10px] text-text-secondary shrink-0">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-text-secondary truncate pr-2">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="bg-primary text-primary-text text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{chat.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        flex-1 flex-col bg-bg-surface transition-colors duration-200
        absolute md:static inset-0 z-20 md:z-auto
        ${isMobileChatOpen ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedChat && currentChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border-main flex items-center justify-between px-4 md:px-6 bg-bg-surface transition-colors duration-200">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBackToChatList}
                  className="md:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-elevated rounded-full"
                >
                  <span className="material-icons-outlined">arrow_back</span>
                </button>
                <img src={currentChat.avatar} alt={currentChat.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div>
                <h3 className="font-medium text-text-main">{currentChat.name}</h3>
                <p className="text-xs text-text-secondary">
                  {currentChat.type === 'employee' ? 'Membro da Equipe' : 'Cliente (Suporte)'} • {currentChat.online ? 'Online agora' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors">
                <span className="material-icons-outlined">call</span>
              </button>
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors">
                <span className="material-icons-outlined">videocam</span>
              </button>
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors">
                <span className="material-icons-outlined">more_vert</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-bg-base transition-colors duration-200">
            {currentMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-3 ${msg.isMine ? 'bg-primary text-primary-text rounded-tr-sm' : 'bg-bg-surface text-text-main border border-border-main rounded-tl-sm'}`}>
                  {msg.type === 'text' && <p className="text-sm">{msg.text}</p>}
                  {msg.type === 'image' && (
                    <div className="flex flex-col gap-2">
                      <img src={msg.fileUrl} alt="Enviado" className="rounded-lg max-w-full h-auto max-h-48 object-cover" referrerPolicy="no-referrer" />
                      {msg.text !== 'Imagem enviada' && <p className="text-xs opacity-80">{msg.text}</p>}
                    </div>
                  )}
                  {msg.type === 'file' && (
                    <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 p-2 rounded-lg">
                      <span className="material-icons-outlined">insert_drive_file</span>
                      <span className="text-sm truncate">{msg.fileName}</span>
                    </div>
                  )}
                  <span className={`text-[10px] mt-1 block ${msg.isMine ? 'text-primary-text/70 text-right' : 'text-text-secondary'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-bg-surface border-t border-border-main relative transition-colors duration-200">
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-4 bg-bg-surface border border-border-main rounded-xl shadow-lg p-2 flex gap-2 z-10">
                {emojis.map(emoji => (
                  <button key={emoji} type="button" onClick={() => handleEmojiClick(emoji)} className="hover:bg-bg-elevated p-1.5 rounded text-xl transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors shrink-0"
              >
                <span className="material-icons-outlined">mood</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors shrink-0"
              >
                <span className="material-icons-outlined">attach_file</span>
              </button>

              <input 
                type="text" 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Digite sua mensagem..." 
                className="flex-1 py-2.5 px-4 bg-bg-base border-none rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-text-main"
              />
              
              <button 
                type="submit"
                disabled={!messageText.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${messageText.trim() ? 'bg-primary text-primary-text hover:bg-primary-hover' : 'bg-bg-elevated text-text-secondary cursor-not-allowed'}`}
              >
                <span className="material-icons-outlined text-sm ml-1">send</span>
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-bg-surface text-text-secondary transition-colors duration-200">
          <span className="material-icons-outlined text-6xl mb-4 opacity-20">chat</span>
          <p>Selecione uma conversa para começar</p>
        </div>
      )}
      </div>
    </div>
  );
};
