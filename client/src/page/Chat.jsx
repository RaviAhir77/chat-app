import React, { useEffect, useState, useRef} from 'react'
import {getSocket} from '../component/socket'
import '../css/Chat.css'
import avatar from '../asset/avatar.jpg'

const Chat = () => {
  const [user,setUser] = useState(JSON.parse(localStorage.getItem("user_details")) || {});
  const [conversation,setConversation] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [message,setMessage] = useState([]);
  const [newMessage,setNewMessage] = useState("");
  const [searchTerm,setSearchTerm] = useState('')
  const [strg,setStrg] = useState([]);
  const [error,setError] =useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    
    const socket = getSocket();
    socketRef.current = socket;

  
    const onConnect = () => {
        console.log('Connected to socket server:', socket.id);
        setSocketConnected(true);
    };

    const onDisconnect = (reason) => {
        console.log('Disconnected from socket server:', reason);
        setSocketConnected(false);
    };

    const onError = (error) => {
        console.error('Socket error:', error);
        setSocketConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);

    if (!socket.connected) {
        socket.connect();
    }

    return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('error', onError);
        
        // Instead of disconnecting, just remove the listeners
        // socket.disconnect();
    };
}, []);
  

  useEffect(() => {
    const fetchConversation = async() => {
      const res = await fetch(`http://localhost:4000/api/conversation/${user.id}`,{
        method: 'GET',
        headers : {
           'Content-type':'application/json'
        }
      });
      const resData = await res.json()
      console.log('resData of conversation :>>' ,resData);
      setConversation(resData.conversationUserData || []) 
    }
    fetchConversation()
  },[user.id])

  useEffect(() => {
    if (!activeConversationId || !socketRef.current) return;

    console.log('Joining room:', activeConversationId);
    socketRef.current.emit('joinRoom', activeConversationId);

    const handleReceiveMessage = (msg) => {
      console.log('Received message:', msg);
      setMessage((prev) => {
        if(prev.some((m) => m._id === msg.id)){
          return prev
        }
        return [...prev,msg]
      });
    };

    socketRef.current.on("receiveMessage", handleReceiveMessage);

    return () => {
      console.log('Leaving room:', activeConversationId);
      socketRef.current.off("receiveMessage", handleReceiveMessage);
      socketRef.current.emit('leaveRoom', activeConversationId);
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;

      const fetchMessage = async () => {
        try {
          const res = await fetch(`http://localhost:4000/api/message/${activeConversationId}`, {
            method: 'GET',
            headers: {
              'Content-type': 'application/json',
            },
          });
          const resData = await res.json();
          console.log('Fetched messages:', resData.messages); // Log the backend response
          setMessage(resData.messages || []);
        } catch (error) {
          console.error('Error fetching messages:', error);
          setError('could not load message')
        }
      };
      fetchMessage();
    
  }, [activeConversationId]);

  
  const sendMessage = async () => {
    if (newMessage.trim() === "" || !socketRef.current) return;

    try {
      const receiverId = conversation.find(
        (c) => c.conversationId === activeConversationId
      )?.receiver?.user;

      if (!receiverId) {
        setError("Receiver ID is missing");
        return;
      }

      const messageData = {
        conversationId: activeConversationId,
        senderId: user.id,
        receiverId,
        message: newMessage,
      };

      // const res = await fetch(`http://localhost:4000/api/message`, {
      //   method: "POST",
      //   headers: {
      //     "Content-type": "application/json",
      //   },
      //   body: JSON.stringify(messageData),
      // });

      // const resData = await res.json();

      if (messageData) {
        // console.log('Message sent successfully:', resData);
        socketRef.current.emit("sendMessage", messageData);
        // setMessage(prev => [...prev, resData.newMessage]);
        setNewMessage("");
      } else {
        // console.error('Failed to send message:', resData);
        setError("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    }
  }


  const searchUser = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/users?name=${searchTerm}`);
      if (!res.ok) {
        throw new Error('No user found');
      }
      const data = await res.json();
      console.log('api response for ❤️ :', data);
  
      if (!Array.isArray(data.users)) {
        throw new Error('Unexpected data format');
      }
      setStrg(data.users);
      setError('');
    } catch (error) {
      console.error(error);
      setError(error.message || 'Unexpected error :::');
      setStrg([]);
    }
  };
  
const createConversation = async (receiverId) => {
    try {
        const senderId = user.id;
        if (!receiverId) {
            setError('Receiver ID is required');
            return;
        }

        const res = await fetch('http://localhost:4000/api/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId, receiverId }),
        });

        const data = await res.json();
        if (res.ok) {
            console.log('Conversation created:', data);

            try {
                const userRes = await fetch(`http://localhost:4000/api/users/${receiverId}`);
                if (!userRes.ok) throw new Error('Failed to fetch receiver details');
                const userData = await userRes.json();

                if(userRes.ok){
                  console.log('user Data : ❤️❤️',userData);  
                }

                const newConversation = {
                    conversationId: data.newConversation._id,
                    receiver: {
                        user: receiverId,
                        name: userData.user.name,
                        email: userData.user.email,
                    },
                };
                setConversation((prev) => [...prev, newConversation]);
                setActiveConversationId(data.newConversation._id);
                setError('');
            } catch (userFetchError) {
                console.error('Error fetching receiver details:', userFetchError);
            }
        } else {
            console.error('Error creating conversation:', data);
            setError(data.message || 'Failed to create conversation');
        }
    } catch (error) {
        console.error('Server error:', error);
        setError('Failed to create conversation');
    }
};
  
  


  return (
    <div className='chat-page'>

        <div className='chat-left'>

          <div className='user-profile'>
            <img src={avatar} alt="avatar" className='user-img'/>
            <div className='user-info'>
                <h3 className='user-name' id='user-name'>{user?.name}</h3>
                <p className='user-account'>{user?.email}</p>
            </div>  
          </div>
          <hr />
          <div className='chat-contact-list'>
            <p className='chat-msg-wr'>Message</p>
            {
              conversation.map(({conversationId,receiver,img = avatar}) => {
                return(
                  <div className={`chat-contacts ${conversationId === activeConversationId ? 'active' : ''}`} 
                  key={conversationId}
                  onClick={() => setActiveConversationId(conversationId)}>
                    <img src={img} alt="avatar" className='contact-img'/>
                    <div className='user-info1'>
                      <h4 className='contact-name'>{receiver?.name}</h4>
                      <p className='contact-status'>{receiver?.email}</p>
                    </div>
                    
                  </div>
                  
                )
              })
            }  
          </div>
        </div>


        <div className='chat-center'>
          {activeConversationId ? (
            <>
            <div className='freind-profile'>
                <img src={avatar} alt="avatar" className='user-img'/>
                <div className="user-info1">
                  <h4 className='freind-name'>{ conversation.find(c => c.conversationId === activeConversationId)?.receiver?.name || 'Friend'}</h4>
                  <p className='freind-status'>{ conversation.find(c => c.conversationId === activeConversationId)?.receiver?.email || 'online  '}</p>
                </div>
            </div>

            <div className='chatting-section'>
                {Array.isArray(message) && message.length > 0 ? (
                  message.map((msg, index) => (
                    <div
                      key={index}
                      className={msg.senderId === user.id ? 'your-msg' : 'freind-msg'}
                    >
                      {msg.message}
                    </div>
                  ))
                ) : (
                  <p className='center-guide'>No messages yet.</p>
                )}
            </div>

            <div className='msg-writen-sec'>
              <input type="text" placeholder='Enter Your message...' className='send-msg' value={newMessage} onChange={(e) => setNewMessage(e.target.value)}/>
              <button className='input-msg-icon' onClick={sendMessage}>SEND</button>
            </div>
            </>
            ):(
            <p className='center-guide'>please select converstation to start chat</p>
          )}
        </div>


        <div className='chat-right'>
          <h3>Search user</h3>
          <div className='findUser-group'>
            <input type="text" 
                  className='findUser'
                  placeholder='Enter UserName'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <button className='find-btn' onClick={searchUser}>Search</button>
          </div>

          {error && <p style={{color : 'red'}}>{error}</p>}
          {strg.length > 0 && (
            <>
             <h4 className='right-result'>Search result</h4>
             {strg.map((user) => (
                <div className='freind-profile' key={user?.id} onClick={() => createConversation(user._id)}>
                <img src={avatar} alt="avatar" className='user-img'/>
                <div className="user-info1">
                  <h4 className='freind-name'>{user?.name}</h4>
                  <p className='freind-status'>{user?.email}</p>
                </div>
            </div>
             ))}
            </>   
          )}
        </div>
    </div>
  )
}

export default Chat;