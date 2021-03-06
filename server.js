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
            res.render("login"); 
        }
    }   
});

//logging in
app.get('/login', auth.isLoggedIn, (req, res) => {
    if(req.userFound) {
        res.render('profile', {
            name: req.userFound.name,
            email: req.userFound.email
        });
    } else{
        res.render('login');
    }
});

app.post('/login', async (req, res) => { 
    try{
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

            res.redirect("profile");
        } else {
            res.render("login", {
                error: "Your login details are incorrect"
            });
        }
    } catch(error) {
        res.render("login", {
            error: "This user does not exist"
        });
    }
});

//profile
app.get('/profile', auth.isLoggedIn, (req, res) => {
    try{
        if(req.userFound) {
            res.render('profile', {
                name: req.userFound.name,
                email: req.userFound.email,
            });
        } else {
            res.render("login");
        }
    } catch(error) {
        res.render("login");
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
    await User.findByIdAndUpdate(req.userFound._id, {
        name: req.body.userName,
        email: req.body.userEmail,
    });
    res.redirect("profile");
});

//edit password
app.get('/password', auth.isLoggedIn, (req, res) => {
    res.render('password');
});

app.post('/password', auth.isLoggedIn, async (req, res) => {
    const isMatch = await bcrypt.compare(req.body.oldPassword, req.userFound.password );
    if (isMatch) {
        if (req.body.newPassword !== req.body.confirmPassword) {
            res.render("password", {
                error: "The passwords do not match"
            })
        } else {
            const hashedPassword = await bcrypt.hash(req.body.newPassword, 13);
            await User.findByIdAndUpdate(req.userFound._id, {
                password: hashedPassword
            });
        res.redirect("profile") 
        }
    } else {
        res.render("password", {
            error: "Password incorrect"
        });
    }
});

//delete
app.get('/delete', auth.isLoggedIn, async (req, res) => {
        await User.findByIdAndDelete(req.userFound._id);
        const posts = await Blogpost.find({ user: req.userFound._id });
        for (let i = 0; i < posts.length; i++) {
            await Blogpost.findByIdAndDelete(posts[i]._id);
        };
        console.log("blog has been deleted");
        res.send("User has been deleted");
});

//create
app.get('/create', auth.isLoggedIn, (req, res) => {
    res.render('create');
});

app.post('/create', auth.isLoggedIn, async (req, res) => {
    await Blogpost.create({
        title: req.body.title,
        body: req.body.content,
        user: req.userFound._id
    });
    res.redirect("profile");
});

//userPosts
app.get('/userPosts', auth.isLoggedIn, async (req, res) => {
    const userPosts = await Blogpost.find({ user: req.userFound._id }).populate('user', 'name');
    const name = await req.userFound.name;
    const newUserPosts = [];
    for(let i = 0; i < userPosts.length; i++) {
        const newDate = userPosts[i].createdAt.toLocaleString("en-GB", {dateStyle: "full", timeStyle: "short" });
        newUserPosts.push({
            blog: userPosts[i],
            date: newDate});
    }
    res.render('userPosts', {
        name: name,
        newUserPosts: newUserPosts
    });
});

//editPost
app.get('/editPost/:id', auth.isLoggedIn, async (req, res) => {
    const post = await Blogpost.findById(req.params.id);
    res.render("editPost",{
        post: post
    });
}); //to pull full title, enclose the double curlies in ""

app.post('/editPost/:id', auth.isLoggedIn, async (req, res) => {
    await Blogpost.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        body: req.body.content,
    });
    res.send("blog has been updated");
});

//deletePost
app.get('/deletePost/:id', auth.isLoggedIn, async (req, res) => {
    await Blogpost.findByIdAndDelete(req.params.id);
    res.send("Post has been deleted");
});

//allPosts
app.get('/allPosts', auth.isLoggedIn, async (req, res) => {
    let isAdmin;
    if(req.userFound.admin){
        isAdmin = true;
    } else {
        isAdmin = false
    }

    const allPosts = await Blogpost.find().populate('user', 'name');
    const newAllPosts = [];
    for(let i = 0; i < allPosts.length; i++) {
        const newDate = allPosts[i].createdAt.toLocaleString("en-GB", {dateStyle: "full", timeStyle: "short" });
        newAllPosts.push({
            blog: allPosts[i],
            date: newDate});
    }
    
    res.render('allPosts', {
        newAllPosts: newAllPosts,
        isAdmin: isAdmin
    });
});

app.post('/allPosts', auth.isLoggedIn, async (req, res) => {//inprogress
    try{
        await Blogpost.findByIdAndDelete(req.body.deletepost);
        res.send("Post has been deleted");
    } catch(error) {
        res.send("Cannot delete");
    };
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

    res.render('allUsers', {
        user: userDB,
        isAdmin: isAdmin
    });
});

app.post('/allUsers', auth.isLoggedIn, async (req, res) => { 
    try{
        await User.findByIdAndDelete(req.body.deleteuser);
        const posts = await Blogpost.find({ user: req.body.deleteuser });
        for (let i = 0; i < posts.length; i++) {
            await Blogpost.findByIdAndDelete(posts[i]._id);
        };
        console.log("blog has been deleted");
        res.send("User has been deleted");
    } catch(error) {
        res.send("Cannot delete");
    };
});

//edit other user
app.get('/editother/:id', auth.isLoggedIn, async (req, res) => {
    const user = await User.findById(req.params.id);
    res.render('editother',{
        name: user.name,
        email: user.email,
        id: user._id 
    });
});

app.post('/editother/:id', auth.isLoggedIn, async (req, res) => {
    try{
        await User.findByIdAndUpdate(req.params.id, {
            name: req.body.userName,
            email: req.body.userEmail
        });
        res.send("User has been updated");
    } catch(error) {
        res.send("That user does not exist");
    };
});


//error handling
app.get("*", (req, res) => {
    res.send("error");
});

app.listen(5000, () => {
    console.log('server is running on port 5000');
});