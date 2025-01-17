const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose')
const http = require('http');
const {Server} = require('socket.io');




require('./db/connection')
const User = require('./models/mUser');
const Conversation = require('./models/mConversation');
const Message = require('./models/mMessage');

const port = process.env.port || 4000;
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cors())

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["my-custom-header"],
    },
    path: "/socket.io/", // Explicitly set the path
    transports: ["websocket", "polling"]     
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (roomId) => {
        console.log(`Socket ${socket.id} joining room ${roomId}`);
        socket.join(roomId);
        socket.emit('roomJoined', roomId);
    });

    socket.on('leaveRoom', (roomId) => {
        console.log(`Socket ${socket.id} leaving room ${roomId}`);
        socket.leave(roomId);
    });

    socket.on('sendMessage', async (messageData) => {
        try {
            console.log('Received message data:', messageData);
            
            if (!messageData.conversationId || !messageData.senderId || !messageData.receiverId || !messageData.message) {
                console.error('Invalid message data:', messageData);
                return;
            }

            const newMessage = await Message.create({
                conversationId: messageData.conversationId,
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                message: messageData.message,
            });

            console.log('Broadcasting message to room:', messageData.conversationId);
            io.to(messageData.conversationId).emit('receiveMessage', newMessage);
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('messageError', { error: 'Failed to process message' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

app.get('/',(req,res) => {
    res.send('there is a node server is a running .....')
})

app.post('/api/register',async(req,res) => {
    try{
        const {name,email,password} = req.body;

        const isExist = await User.findOne({email})
        if(isExist){
            return res.status(400).json({message :'that user is already existed please login'})
        }

        const hashedPass = await bcrypt.hash(password,10)
        const newUser = new User({
            name,
            email,
            password:hashedPass,
        })
        await newUser.save();

        const payload = {
            userId : newUser._id,
            user : newUser.name,
            email: newUser.email,
        }

        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY_FOR_TEST";

        const token = jwt.sign(payload,JWT_SECRET_KEY,{expiresIn:'24h'});

        newUser.token = token;
        newUser.save();

        const userResponse = {
            id: newUser._id,
            name : newUser.name,
            email : newUser.email
        }
        res.status(201).json({message:'newUser saved succsessfully',token, user:userResponse})
        
    }catch(error){
        res.status(500).send('there is a error on store data in database :');
    }
});

app.post('/api/login',async(req,res) => {
    try{
        const {email,password} = req.body;
        const user = await User.findOne({email})

        if(!user){
            return res.status(401).json({message:'there user is a not exist please a register !'})
        }

        const isPasswordIsValid = await bcrypt.compare(password,user.password)
        if(!isPasswordIsValid){
            return res.status(401).json({message:'User Email or Password is incorrect !!'})
        }

        const payload = {
            userId : user._id,
            user:user.name,
            email: user.email,
        }

        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY_FOR_TEST";

        const token = jwt.sign(payload,JWT_SECRET_KEY,{expiresIn:'24h'});

        user.token = token;
        user.save();
        res.status(200).json({message:'login succsessfull',
            token,
            user : {
                id:user._id,
                name : user.name,
                email: user.email,
            }
        })
    }catch(error){
        res.status(500).json({message:'error in Login', error})
    }
});

app.get('/api/users/', async(req,res) => {
    try{
       const name = req.query.name;
       if(!name){
        return res.status(400).json({message : 'Name is a required'})
       }

       const users = await User.find({name : {$regex:name, $options:'i'}})

       if(users.length == 0){
         return res.status(404).json({message : 'No user found'});
       }

       res.status(200).json({users})
    }catch(error){
        res.status(500).json({error})
    }
})

app.get('/api/users/:id',async(req,res) => {
    try{
        const id = req.params.id;

        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(401).json({message : 'invalid user ID'})
        }

        const user = await User.findById(id);

        if(!user){
            return res.status(400).json({message : 'user not found'})
        }

        res.status(200).json({user})
    }catch(error){
        res.status(500).json({message : 'internel server error', error})
    }
})

app.post('/api/conversation', async (req, res) => {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Both senderId and receiverId are required" });
    }
    try {
      const isExistingConversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] },
      });
      if (isExistingConversation) {
        return res.status(200).json({ conversation: isExistingConversation });
      } else {
        const newConversation = new Conversation({
          members: [senderId, receiverId].sort(),
        });
        await newConversation.save();
        res.status(201).json({ message: 'New conversation created', newConversation });
      }
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  

app.get('/api/conversation/:userId',async (req,res) => {
    try{
        const userId = req.params.userId;
        const conversations = await Conversation.find({members : {$in : [userId]}});
        const conversationUserData =await Promise.all( 
                conversations.map(async(conversation) => {
                const receiverId = conversation.members.find((member) => member !== userId)
                const user = await User.findById(receiverId);
                const receiverData = {
                    user:user._id,
                    name:user.name,
                    email:user.email
                } 
                return {
                    conversationId : conversation._id,
                    receiver : receiverData,
                }    
            }) 
        )
        res.status(200).json({message:'user conversation :',conversationUserData})  
    }catch(error){
        res.status(500).json({message:'there is a problem find conversation for this userid',error})
    }
})

app.post('/api/message', async (req, res) => {
    log('api end point for a message :',req.body)

    res.status(200).json({success : true})
    // try {
    //     const { conversationId, senderId, receiverId, message } = req.body;

    //     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    //         return res.status(400).json({ message: 'Invalid conversationId' });
    //     }

    //     const newMessage = new Message({ conversationId, senderId, receiverId, message });
    //     await newMessage.save();
    //     res.status(201).json({ message: 'New message created', newMessage });
    // } catch (error) {
    //     console.error('Error creating message:', error);
    //     res.status(500).json({ message: 'Internal Server Error', error });
    // }
});

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversationId' });
        }

        const messages = await Message.find({ conversationId });
        res.status(200).json({ message: 'Messages retrieved successfully', messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal Server Error', error });
    }
});


server.listen(port,() =>{
    console.log(`server running on a port : ${port} 😊😊`);   
})
