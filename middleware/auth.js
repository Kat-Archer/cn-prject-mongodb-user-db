const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); 

exports.isLoggedIn = async (req, res, next) => {
    console.log("Checking if user is logged in");

    if(req.cookies.jwt) {
        console.log("The cookie JWT exists");

        const decoded = /*promisify/*helps you run promises*/await jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); //param 1 is value of token to verify, 2nd param is password
        console.log("My token decoded");
        console.log(decoded); //gives user id, when token was issued, when token expires

        req.userFound = await User.findById(decoded.id);
    };
    
    
    next(); //must include to stop it hanging
}

exports.logout = (req, res, next) => {
    res.cookie('jwt','logout', {
        expires: new Date( Date.now() + 2*1000),
        httpOnly: true
    });

    next()
}