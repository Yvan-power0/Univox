import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import { 
  Send, 
  Users, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Smile, 
  MoreHorizontal,
  UserPlus,
  Check,
  X,
  Pin,
  Trash2,
  Reply,
  Copy,
  Search,
  Menu,
  ArrowLeft
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  
  const emojis = ['😀', '😂', '😍', '👍', '❤️', '😢', '😮', '😡', '🎉', '🔥', '💯', '✨'];

  useEffect(() => {
    // Check for session ID in URL fragment
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1];
      handleAuth(sessionId);
    } else {
      // Check for existing session
      const savedToken = localStorage.getItem('univox_session');
      if (savedToken) {
        setSessionToken(savedToken);
        fetchProfile(savedToken);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (user && sessionToken) {
      initializeSocket();
      fetchMessages();
      fetchFriends();
    }
  }, [user, sessionToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAuth = async (sessionId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionToken(data.session_token);
        localStorage.setItem('univox_session', data.session_token);
        window.location.hash = '';
        setProfileData(data.user);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (token) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'X-Session-ID': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfileData(data.user);
      } else {
        localStorage.removeItem('univox_session');
        setSessionToken(null);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = () => {
    const newSocket = io(BACKEND_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join_chat', { user });
    });

    newSocket.on('new_message', (data) => {
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.filter(msg => msg.message_id !== data.message_id));
      } else if (data.type === 'reaction_update') {
        setMessages(prev => prev.map(msg => 
          msg.message_id === data.message_id 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      }
    });

    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data.user);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        headers: {
          'X-Session-ID': sessionToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Messages fetch error:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: {
          'X-Session-ID': sessionToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
        setPendingRequests(data.pending_requests);
      }
    } catch (error) {
      console.error('Friends fetch error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionToken
        },
        body: JSON.stringify({
          content: newMessage,
          message_type: 'text',
          reply_to: replyTo?.message_id
        })
      });

      if (response.ok) {
        setNewMessage('');
        setReplyTo(null);
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleLogin = () => {
    const previewUrl = window.location.origin;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(previewUrl)}/profile`;
  };

  const handleLogout = () => {
    localStorage.removeItem('univox_session');
    setUser(null);
    setSessionToken(null);
    setMessages([]);
    setFriends([]);
    if (socket) {
      socket.disconnect();
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'X-Session-ID': sessionToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionToken
        },
        body: JSON.stringify({ friend_id: userId })
      });

      if (response.ok) {
        alert('Demande d\'ami envoyée !');
        setSearchResults([]);
        setSearchQuery('');
      } else {
        const error = await response.json();
        alert(error.detail);
      }
    } catch (error) {
      console.error('Friend request error:', error);
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/request/${requestId}?action=${action}`, {
        method: 'PUT',
        headers: {
          'X-Session-ID': sessionToken
        }
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Friend response error:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionToken
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setEditingProfile(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await fetch(`${BACKEND_URL}/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionToken
        },
        body: JSON.stringify({ message_id: messageId, emoji })
      });
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-ID': sessionToken
        }
      });
    } catch (error) {
      console.error('Delete message error:', error);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          picture: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-ocean"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-night via-ocean to-anthracite flex items-center justify-center">
        <div className="bg-anthracite p-8 rounded-2xl shadow-2xl text-center max-w-md mx-4">
          <div className="text-6xl mb-6">🌌</div>
          <h1 className="text-4xl font-bold text-white mb-4">Univox</h1>
          <p className="text-gray-300 mb-8">Votre nouvelle expérience de messagerie sociale</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-ocean hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  const Sidebar = () => (
    <div className={`${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 w-64 bg-anthracite h-full transition-transform duration-300 ease-in-out`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-3xl">🌌</div>
          <h1 className="text-2xl font-bold text-white">Univox</h1>
        </div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => {setCurrentView('chat'); setShowMobileMenu(false);}}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentView === 'chat' ? 'bg-ocean text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Send size={20} />
            Messagerie
          </button>
          
          <button 
            onClick={() => {setCurrentView('friends'); setShowMobileMenu(false);}}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentView === 'friends' ? 'bg-ocean text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Users size={20} />
            Amis ({friends.length}/5)
          </button>
          
          <button 
            onClick={() => {setCurrentView('profile'); setShowMobileMenu(false);}}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentView === 'profile' ? 'bg-ocean text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <User size={20} />
            Profil
          </button>
          
          <button 
            onClick={() => {setCurrentView('settings'); setShowMobileMenu(false);}}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentView === 'settings' ? 'bg-ocean text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Settings size={20} />
            Paramètres
          </button>
        </nav>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-xl mb-4">
            <img 
              src={user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2Mzc0OEYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K'} 
              alt={user.name} 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 text-left">
              <div className="text-white font-medium text-sm">{user.name}</div>
              <div className="text-gray-400 text-xs">@{user.username}</div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-anthracite border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden text-white p-2 hover:bg-gray-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Chat Univox</h2>
              <p className="text-gray-400 text-sm">Discussions publiques</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-500 w-3 h-3 rounded-full"></span>
            <span className="text-gray-400 text-sm">En ligne</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.message_id} className="group relative">
            {message.reply_to && (
              <div className="ml-12 mb-2 p-2 bg-gray-700/50 rounded-lg text-sm text-gray-300">
                Réponse à un message
              </div>
            )}
            
            <div className={`flex gap-3 ${message.user_id === user.user_id ? 'flex-row-reverse' : ''}`}>
              <img 
                src={message.user?.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2Mzc0OEYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K'} 
                alt={message.user?.name} 
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              
              <div className={`flex-1 ${message.user_id === user.user_id ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm">{message.user?.name}</span>
                  <span className="text-gray-400 text-xs">{formatTime(message.created_at)}</span>
                </div>
                
                <div className={`relative inline-block max-w-md p-3 rounded-2xl ${
                  message.user_id === user.user_id 
                    ? 'bg-ocean text-white' 
                    : 'bg-gray-700 text-white'
                }`}>
                  <p className="break-words">{message.content}</p>
                  
                  {Object.keys(message.reactions || {}).length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {Object.entries(message.reactions).map(([userId, emoji]) => (
                        <span key={userId} className="bg-gray-600 px-2 py-1 rounded-full text-xs">
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setActiveMessageMenu(activeMessageMenu === message.message_id ? null : message.message_id)}
                    className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-gray-600 p-1 rounded-full transition-opacity"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  
                  {activeMessageMenu === message.message_id && (
                    <div className="absolute top-6 right-0 bg-anthracite border border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                      <button 
                        onClick={() => {setReplyTo(message); setActiveMessageMenu(null);}}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Reply size={16} />
                        Répondre
                      </button>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(message.content); setActiveMessageMenu(null);}}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Copy size={16} />
                        Copier
                      </button>
                      <div className="border-t border-gray-600">
                        <div className="p-2 grid grid-cols-6 gap-1">
                          {emojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {addReaction(message.message_id, emoji); setActiveMessageMenu(null);}}
                              className="p-1 hover:bg-gray-600 rounded text-center"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      {message.user_id === user.user_id && (
                        <button 
                          onClick={() => {deleteMessage(message.message_id); setActiveMessageMenu(null);}}
                          className="w-full text-left px-4 py-2 hover:bg-red-900/20 text-red-400 flex items-center gap-2 border-t border-gray-600"
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-anthracite border-t border-gray-700">
        {replyTo && (
          <div className="mb-3 p-2 bg-gray-700 rounded-lg flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Réponse à <span className="font-medium">{replyTo.user?.name}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tapez votre message..."
              className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ocean"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <Smile size={20} />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 bg-anthracite border border-gray-600 rounded-lg p-2 grid grid-cols-6 gap-1">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {setNewMessage(prev => prev + emoji); setShowEmojiPicker(false);}}
                    className="p-2 hover:bg-gray-700 rounded text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-ocean hover:bg-blue-600 disabled:bg-gray-600 text-white p-3 rounded-xl transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const FriendsView = () => (
    <div className="h-full overflow-y-auto">
      <div className="p-4 bg-anthracite border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden text-white p-2 hover:bg-gray-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Amis ({friends.length}/5)</h2>
          </div>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {setSearchQuery(e.target.value); searchUsers(e.target.value);}}
            placeholder="Rechercher des utilisateurs..."
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-ocean"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-4 bg-gray-700 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Résultats de recherche</h3>
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-600 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2Mzc0OEYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K'} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-white font-medium">{user.name}</div>
                      <div className="text-gray-400 text-sm">@{user.username}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendFriendRequest(user.user_id)}
                    className="bg-ocean hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <UserPlus size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3">Demandes d'amitié</h3>
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.request_id} className="bg-gray-700 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={request.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2Mzc0OEYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K'} 
                        alt={request.name} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-white font-medium">{request.name}</div>
                        <div className="text-gray-400 text-sm">@{request.username}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => respondToFriendRequest(request.request_id, 'accept')}
                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <Check size={20} />
                      </button>
                      <button 
                        onClick={() => respondToFriendRequest(request.request_id, 'reject')}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-white font-medium mb-3">Mes amis</h3>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-400">Aucun ami pour le moment</p>
              <p className="text-gray-500 text-sm">Recherchez des utilisateurs pour envoyer des demandes d'amitié</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.user_id} className="bg-gray-700 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={friend.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2Mzc0OEYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K'} 
                        alt={friend.name} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-white font-medium">{friend.name}</div>
                        <div className="text-gray-400 text-sm">@{friend.username}</div>
                        {friend.bio && <div className="text-gray-500 text-sm mt-1">{friend.bio}</div>}
                      </div>
                    </div>
                    <button className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="h-full overflow-y-auto">
      <div className="p-4 bg-anthracite border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden text-white p-2 hover:bg-gray-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Mon Profil</h2>
          </div>
          <button 
            onClick={() => setEditingProfile(!editingProfile)}
            className="bg-ocean hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {editingProfile ? 'Annuler' : 'Modifier'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <img 
                src={editingProfile ? profileData.picture : user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjM3NEFGIi8+Cjxzdmcgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMCAyMVYxOUE0IDQgMCAwIDAgMTYgMTVIOEE0IDQgMCAwIDAgNCAxOVYyMSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+Cg=='} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-ocean"
              />
              {editingProfile && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-ocean text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  <User size={16} />
                </button>
              )}
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Nom complet</label>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileData.name || ''}
                  onChange={(e) => setProfileData(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean"
                />
              ) : (
                <div className="bg-gray-700 text-white rounded-lg px-4 py-3">{user.name}</div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Nom d'utilisateur</label>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileData.username || ''}
                  onChange={(e) => setProfileData(prev => ({...prev, username: e.target.value}))}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean"
                />
              ) : (
                <div className="bg-gray-700 text-white rounded-lg px-4 py-3">@{user.username}</div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <div className="bg-gray-700 text-gray-400 rounded-lg px-4 py-3">{user.email}</div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Bio</label>
              {editingProfile ? (
                <textarea
                  value={profileData.bio || ''}
                  onChange={(e) => setProfileData(prev => ({...prev, bio: e.target.value}))}
                  rows={3}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean resize-none"
                  placeholder="Parlez-nous de vous..."
                />
              ) : (
                <div className="bg-gray-700 text-white rounded-lg px-4 py-3 min-h-[80px]">
                  {user.bio || "Aucune bio ajoutée"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Âge</label>
                {editingProfile ? (
                  <input
                    type="number"
                    value={profileData.age || ''}
                    onChange={(e) => setProfileData(prev => ({...prev, age: parseInt(e.target.value) || null}))}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean"
                  />
                ) : (
                  <div className="bg-gray-700 text-white rounded-lg px-4 py-3">{user.age || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Pays</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={profileData.country || ''}
                    onChange={(e) => setProfileData(prev => ({...prev, country: e.target.value}))}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean"
                  />
                ) : (
                  <div className="bg-gray-700 text-white rounded-lg px-4 py-3">{user.country || '-'}</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Centres d'intérêt</label>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileData.interests || ''}
                  onChange={(e) => setProfileData(prev => ({...prev, interests: e.target.value}))}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean"
                  placeholder="Musique, sport, tech..."
                />
              ) : (
                <div className="bg-gray-700 text-white rounded-lg px-4 py-3">{user.interests || '-'}</div>
              )}
            </div>

            {editingProfile && (
              <button 
                onClick={updateProfile}
                className="w-full bg-ocean hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Sauvegarder les modifications
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="h-full overflow-y-auto">
      <div className="p-4 bg-anthracite border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden text-white p-2 hover:bg-gray-700 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-xl font-bold text-white">Paramètres</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-gray-700 p-4 rounded-xl">
            <h3 className="text-white font-medium mb-2">Notifications</h3>
            <p className="text-gray-400 text-sm mb-4">Gérez vos préférences de notification</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-white">Messages</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white">Demandes d'amitié</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-xl">
            <h3 className="text-white font-medium mb-2">Confidentialité</h3>
            <p className="text-gray-400 text-sm mb-4">Contrôlez votre visibilité</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-white">Profil public</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white">Mode Ne Pas Déranger</span>
                <input type="checkbox" className="toggle" />
              </label>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-xl">
            <h3 className="text-white font-medium mb-2">Thème</h3>
            <p className="text-gray-400 text-sm mb-4">Apparence de l'application</p>
            <div className="grid grid-cols-1 gap-2">
              <button className="bg-ocean text-white p-3 rounded-lg text-left">
                🌙 Thème sombre (actuel)
              </button>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-xl">
            <h3 className="text-white font-medium mb-2">À propos</h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">Version: 1.0.0</div>
              <div className="text-gray-300">Univox - Messagerie sociale</div>
              <div className="text-gray-400">Développé avec ❤️</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-night text-white flex">
      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-hidden">
          {currentView === 'chat' && <ChatView />}
          {currentView === 'friends' && <FriendsView />}
          {currentView === 'profile' && <ProfileView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>
      
      {/* Click outside to close menus */}
      {(activeMessageMenu || showEmojiPicker) && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => {
            setActiveMessageMenu(null);
            setShowEmojiPicker(false);
          }}
        />
      )}
    </div>
  );
}

export default App;