const mongoose = require('mongoose');

const user = new mongoose.Schema({ //types of fields in db
    name: {
        type: String, //must start with capital
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
        default: false //can be added to any. should not be used on the same one as required
    }
});

module.exports = mongoose.model('user', user); //first part is name of collection, second value is schema created above