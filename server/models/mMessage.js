const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    conversationId : {
        type:mongoose.Schema.Types.ObjectId, 
        ref:'Conversation',
        required:true,
    },

    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },

    receiverId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },

    message:{
        type:String,
        required:true
    }
})

module.exports = mongoose.model('Message',messageSchema);