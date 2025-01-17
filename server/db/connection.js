const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/chatapp")
.then(() => console.log('Database is a connected a succssesfully 😊'))
.catch((error) => console.error('there is a something error :', error));

module.exports = mongoose;

