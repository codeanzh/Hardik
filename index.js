require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(session({
    secret: "User Credentials",
    resave: false,
    saveUninitialized: false
}));

dbname = "ArduinoTest";
url = process.env.DATA_BASE + dbname;
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const dataSchema = new mongoose.Schema ({
    time: {
        year: Number,
        month: Number,
        day: Number,
        hour: Number,
        minute: Number,
        second: Number
    },
    temperature: Number,
    humidity: Number,
    presure: Number,
    windSpeed: Number,
    direction: Number,
    rain: Number
});

const Data = new mongoose.model("Data", dataSchema);

const arduinoDataSchema = new mongoose.Schema({
    arduinoCode: Number,
    registered: Boolean,
    data: [dataSchema]
});

const ArduinoData = new mongoose.model("ArduinoData", arduinoDataSchema);

const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    arduino: arduinoDataSchema
});

const User = new mongoose.model("User", userSchema);

app.post("/setArduino")

app.get("/", function(req, res){
    if (req.session.user)
        return res.redirect("/setArduino");

    console.log("User Entered Home");
    res.sendFile(__dirname + "/public/home.html");
});

app.get("/signup", function(req, res){
    if (req.session.user)
        return res.redirect("/setArduino");
        
    console.log("New User Entered");
    res.sendFile(__dirname + "/public/signup.html");
});

app.get("/login", function(req, res){
    if (req.session.user)
        return res.redirect("/setArduino");
        
    console.log("User Entered");
    res.sendFile(__dirname + "/public/login.html");
});

app.get("/setArduino", function(req, res){
    if (req.session.user)
    {
        if (req.session.user.arduino === null)
            res.sendFile(__dirname + "/public/setArduino.html");
        else
            return res.redirect("/main");
    }
    else
        return res.redirect("/login");
});

app.post("/signup", function(req, res){

    if (req.body.name === "" || req.body.name === null)
    {
        console.log("Usename Empty");
        return res.redirect("/signup");
    }

    if (req.body.password === "" || req.body.password === null || req.body.password.length < 6)
    {
        console.log("Password Empty");
        return res.redirect("/signup");
    }

    User.findOne({email: req.body.email}, function(err, userFound){
        if (err)
        {
            console.log(err);
            return res.redirect("/signup");
        }
        else if (userFound)
        {
            console.log("User Exist");
            return res.redirect("/signup");
        }
        else
        {
            bcrypt.hash(req.body.password, 10, function(err, hash){
                if (err)
                {
                    console.log(err);
                    return res.redirect("/signup");
                }
                else
                {
                    user = new User({
                        name: req.body.name,
                        email: req.body.email,
                        password: hash,
                        arduino: null
                    });

                    user.save(function(err){
                        if(err)
                        {
                            console.log(err);
                            return res.redirect("/signup");
                        }
                        else
                        {
                            req.session.user = user;
                            return res.redirect("/setArduino");
                        }
                    });
                }
            });
        }
    });
});

app.post("/login", function(req, res){
    
});

app.post("/saveData", function(req, res){

    const arduinoData = new ArduinoData({
        arduinoCode: req.body.arduinoCode,
        time: {
            year: req.body.time.year,
            month: req.body.time.month,
            day: req.body.time.day,
            hour: req.body.time.hour,
            minute: req.body.time.minute,
            second: req.body.time.second
        },
        temperature: req.body.temperature,
        humidity: req.body.humidity,
        presure: req.body.presure,
        windSpeed: req.body.windSpeed,
        direction: req.body.direction,
        rain: req.body.rain
    });

    arduinoData.save();

    console.log("Data Saved!");

    res.send("Data Saved!");
});

app.listen(3000, function(){
    console.log("Server Started on Port 3000");
    console.log(process.env.API_KEY);   
});