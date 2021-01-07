const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/userModel'); //when importing a model, use a capital letter, use this to accessdb
const Blogpost = require('./models/blogpostModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); //needs to be initialised
const auth = require('./middleware/auth');

const app = express();
dotenv.config( { path: './.env' } );

mongoose.connect( process.env.DB_URL, { 
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then( () => console.log('MongoDB is Connected')); 

const viewsPath = path.join(__dirname, '/views');
const publicDirectory = path.join(__dirname, '/public');

app.set('views', viewsPath);
app.set('view engine', 'hbs');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({extended: false})); 
app.use(express.json({extended: false}));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    // check that the passwords are the same
    if (req.body.userPassword !== req.body.confirmPassword) {
        res.render("register", {
            error: "The passwords do not match"
        })
    } else {
        //check that the email does not already exist
        const alreadyExists = await User.find({email: req.body.userEmail});
        console.log(alreadyExists)
        
        if (alreadyExists.length > 0) {
            res.render("register", {
                error: "This email address already exists"
            })
        } else {
            const hashedPassword = await bcrypt.hash(req.body.userPassword, 13);
            await User.create({
                name: req.body.userName,
                email: req.body.userEmail,
                password: hashedPassword
            });
            res.send("User Registered"); //change to load profile page
        }
    }   
});




app.get("*", (req, res) => {
    res.send("error");
});

app.listen(5000, () => {
    console.log('server is running on port 5000');
});