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

//home page
app.get('/', (req, res) => {
    res.render('index');
});

//registering
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

//logging in
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => { 
    const user = await User.findOne({email: req.body.userEmail}); // finds full object

    const isMatch = await bcrypt.compare(req.body.userPassword, user.password ); //compares the two passwords and returns a boolean

    if (isMatch) {
        const token = jwt.sign( {id: user._id}, process.env.JWT_SECRET, { //jwt is jsonwebtoken which creates the unique token for the user which is then stored as a cookie in the browser
            expiresIn: process.env.JWT_EXPIRES_IN
        }); 
        
        console.log(token);

        const cookieOptions = {
            expires: new Date(
                Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
            ), 
            httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions); //creating the cookie on your browser(name of cookie, value of cookie, how long is cookie valid)

        res.redirect('profile'); //send to profile
    } else {
        res.send("Your login details are incorrect"); //add to login page
    }
});

//profile
app.get('/profile', auth.isLoggedIn, (req, res) => {
    try{
        if(req.userFound) {
            res.render('profile', {
                name: req.userFound.name,
                email: req.userFound.email
            });
        } else {
            res.send("You are not logged in");
        }
    } catch(error) {
        res.send("User not found");
    };
});

//edit
app.get('/edit', auth.isLoggedIn, (req, res) => {
    res.render('edit',{
        name: req.userFound.name,
        email: req.userFound.email 
    });
});

app.post('/edit', auth.isLoggedIn, async (req, res) => {
    // console.log(req.userFound._id)
    try{
        await User.findByIdAndUpdate(req.userFound._id, {
            name: req.body.userName,
            email: req.body.userEmail,
        });
        res.send("User has been updated");
    } catch(error) {
        res.send("That user does not exist");
    };
});

//edit password
app.get('/password', auth.isLoggedIn, (req, res) => {
    res.render('password');
});

app.post('/password', auth.isLoggedIn, async (req, res) => {
    const isMatch = await bcrypt.compare(req.body.oldPassword, req.userFound.password );
    console.log(isMatch);
    if (isMatch) {
        console.log("match");
        if (req.body.newPassword !== req.body.confirmPassword) {
            console.log("no Match");
            res.render("password", {
                error: "The passwords do not match"
            })
        } else {
            console.log("changing");
            const hashedPassword = await bcrypt.hash(req.body.newPassword, 13);
            await User.findByIdAndUpdate(req.userFound._id, {
                password: hashedPassword
            });
        res.send("password changed") 
        }
    } else {
        res.send("Password incorrect");
    }
});

//delete
app.get('/delete', auth.isLoggedIn, async (req, res) => {
    try{
        await User.findByIdAndDelete(req.userFound._id);
        res.send("User has been deleted");
    } catch(error) {
        res.send("That user does not exist");
    };
});

//create
app.get('/create', auth.isLoggedIn, (req, res) => {
    res.render('create');
});

app.post('/create', auth.isLoggedIn, async (req, res) => {
    console.log(req.userFound._id);
    await Blogpost.create({
        title: req.body.title,
        body: req.body.content,
        user: req.userFound._id
    });
    res.send("Post Created");
});

//userPosts
app.get('/userPosts', auth.isLoggedIn, async (req, res) => {
    const userPosts = await Blogpost.find({ user: req.userFound._id }).populate('user', 'name');
    const name = await req.userFound.name;
    res.render('userPosts', {
        name: name,
        userPosts: userPosts
    });
});

//allPosts
app.get('/allPosts', auth.isLoggedIn, async (req, res) => {
    const allPosts = await Blogpost.find().populate('user', 'name');

    for(let i = 0; i < allPosts.length; i++) {
        allPosts[i].createdAt.toLocaleString("en-GB", {dateStyle: "full"});
        console.log(allPosts[i].createdAt);
        
    }
    
    res.render('allPosts', {
        allPosts: allPosts
    });
});

//allUsers
app.get('/allUsers', auth.isLoggedIn, async (req, res) => {
    let isAdmin;
    if(req.userFound.admin){
        isAdmin = true;
    } else {
        isAdmin = false
    }

    const userDB = await User.find();
    // console.log(userDB);

    res.render('allUsers', {
        user: userDB,
        isAdmin: isAdmin
    });
});

//error handling
app.get("*", (req, res) => {
    res.send("error");
});

app.listen(5000, () => {
    console.log('server is running on port 5000');
});