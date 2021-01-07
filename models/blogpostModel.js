const mongoose = require('mongoose');

const blogpost = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    // date: {
    //     type: Date,
    //     default: new Date() //creates as current date
    // },
    body: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, //how you pull from another db
        required: true,
        ref: 'user' //reference the user (name of other db) collection
    }
}, {
    timestamps: true //timestamps the post
})

module.exports = mongoose.model('blogpost', blogpost); //first part is name of collection which will become plural, second value is schema created above