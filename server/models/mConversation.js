const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    members:{
        type:Array,
        required:true
    },
},{timestamps:true})

module.exports = mongoose.model('Conversation',conversationSchema);