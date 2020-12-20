require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(session({
    secret: "User Credentials",
    resave: false,
    saveUninitialized: false
}));

dbname = "Arduino-Weather-Cast";
url = process.env.DATA_BASE + dbname;
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const dataSchema = new mongoose.Schema ({
    arduinoCode: String,
    time: Date,
    temperature: Number,
    humidity: Number,
    presure: Number,
    windSpeed: Number,
    direction: Number,
    rain: Number
});

const Data = new mongoose.model("Data", dataSchema);

const arduinoDataSchema = new mongoose.Schema({
    arduinoCode: String,
    registered: Boolean,
    dataPresent: Boolean,
    minTime: Date,
    maxTime: Date
});

const ArduinoData = new mongoose.model("ArduinoData", arduinoDataSchema);

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    arduino: String
});

const User = new mongoose.model("User", userSchema);

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

app.get("/main", function(req, res){
    if (req.session.user)
    {
        if (req.session.user.arduino === null)
            return res.redirect("/setArduino");
        else
            ArduinoData.findOne({_id: req.session.user.arduino}, function(err, arduinoDataFound){
                if (err)
                {
                    console.log(err);
                    res.send("<form action='/logout' method='post'><input type='submit' name='LOGOUT' value='LOGOUT'><br><br><br></form><p>UNKNOWN ERROR TRY AGAIN LATER<p>");
                }
                else if (arduinoDataFound)
                {
                    req.session.arduinoCode = arduinoDataFound.arduinoCode;

                    if (arduinoDataFound.dataPresent)
                    {
                        console.log("Main Page");
                        req.session.arduinoData = arduinoDataFound;
                        if (req.session.result)
                        {
                            result = req.session.result;
                            req.session.result = null;
                            console.log("Data Sent");
                            res.render(__dirname + "/public/main", {start_date_time: JSON.stringify(req.session.arduinoData.minTime).slice(1,17), end_date_time: JSON.stringify(req.session.arduinoData.maxTime).slice(1,17), data: true, dataResult: result, length: result.length});
                        }
                        else
                            res.render(__dirname + "/public/main", {start_date_time: JSON.stringify(arduinoDataFound.minTime).slice(1,17), end_date_time: JSON.stringify(arduinoDataFound.maxTime).slice(1,17), data: false, dataResult: null, length: 0});
                    }
                    else
                    {
                        console.log("No Data Has Been Sent From Arduino");
                        res.send("<form action='/logout' method='post'><input type='submit' name='LOGOUT' value='LOGOUT'><br><br><br></form><p>No Data Has Been Sent From Arduino<p>");
                    }
                }
                else
                {
                    console.log("Arduino Not Found");
                    res.send("<form action='/logout' method='post'><input type='submit' name='LOGOUT' value='LOGOUT'><br><br><br></form><p>Arduino Not Found<p>");
                }
            });
    }
    else
        return res.redirect("/login");
});

app.post("/showData", function(req, res){
    if (req.session.user)
    {
        if (req.session.user.arduino === null)
            return res.redirect("/saveArduino");
        else if (req.session.arduinoCode)
        {
            if (req.body.start_date_time === "" || req.body.start_date_time === null || req.body.end_date_time === "" || req.body.end_date_time === null)
            {
                console.log("No Data Eneterd");
                return res.redirect("/main");
            }
            else
            {
                Data.find({arduinoCode: req.session.arduinoCode, time: {$gt: req.body.start_date_time + ":00.000+00:00", $lt: req.body.end_date_time + ":59.999+00:00"}}).exec(function(err, result){
                    if (err)
                    {
                        console.log(err);
                        return res.redirect("/main");
                    }
                    else if (result)
                    {
                        console.log("Result Came");
                        req.session.result = result;
                        console.log(result);
                        return res.redirect("/main");
                    }
                    else
                    {
                        console.log("No Results Found");
                        return res.redirect("/main");
                    }
                });
            }
        }
        else
        {
            console.log("Data Tried to Shown Withough setting up the session");
            return res.redirect("/main");
        }
    }
    else
        return res.redirect("/login");
});

app.post("/saveArduino", function(req, res){
    if (req.body.api_key === process.env.API_KEY)
    {
        let prev_match = 0;
        let prev_match_arr = [];
        let error_num = 0;
        let error_arr = [];
        let x = 0;

        function check_done(){

            x += 1;

            if (x === req.body.data.length){
                return_data = "Done\nNumber of Previus match = " + prev_match + "\n";

                for (var i = 0; i < prev_match; i++)
                    return_data += prev_match_arr[i] + "\n";
                
                return_data += "Number of errors = " + error_num + "\n";
    
                for (var i = 0; i < error_num; i++)
                    return_data += error_arr[i];
    
                res.send(return_data);
            }
        }

        req.body.data.forEach(function(item, index){
            ArduinoData.findOne({arduinoCode: item}, function(err, arduinoDataFound){
                if (err)
                {
                    console.log(err);
                    res.send(err);
                    check_done(index);
                }
                else if (arduinoDataFound)
                {
                    prev_match += 1;
                    prev_match_arr.push(item);
                    check_done(index);
                }
                else
                {
                    arduinoData = new ArduinoData({
                        arduinoCode: item,
                        registered: false,
                        dataPresent: false,
                        minTime: null,
                        maxTime: null
                    });

                    arduinoData.save(function(error){
                        if (error)
                        {
                            error_num += 1;
                            error_arr.push(item + "   ===>>>   " + err + "\n");
                        }
                        check_done();
                    });
                }
            });
        });
    }
    else
        res.send("Wrong API_KEY");
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

                    user.save(function(error){
                        if(error)
                        {
                            console.log(error);
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
    if (req.session.user)
        return res.redirect("/setArduino");
    else
    {
        User.findOne({email: req.body.email}, function(err, userFound){
            if (err)
            {
                console.log(err);
                return res.redirect("/login");
            }
            else if (userFound)
            {
                bcrypt.compare(req.body.password, userFound.password, function(error, result){
                    if (error)
                    {
                        console.log(error);
                        return res.redirect("/login");
                    }
                    else if (result === true)
                    {
                        req.session.user = userFound;
                        console.log("Signed in successfuly");
                        return res.redirect("/login");
                    }
                    else
                    {
                        console.log("Wrong Password");
                        return res.redirect("/login");
                    }
                });
            }
            else
            {
                console.log("Wrong Username and Password");
                return res.redirect("/login");
            }
        });
    }
});

app.post("/logout", function(req, res){
    if (req.session.user)
    {
        req.session.destroy(function(){
            console.log("Logout Successfuly");
            return res.redirect("/login");
        });
    }
    else
        return res.redirect("/login");
});

app.post("/setArduino", function(req, res){
    if (req.session.user)
    {
        if (req.session.user.arduino === null)
        {
            ArduinoData.findOne({arduinoCode: req.body.arduinoCode}, function(err, arduinoCodeFound){
                if (err)
                {
                    console.log(err);
                    return res.redirect("/setArduino");
                }
                else if (arduinoCodeFound)
                {
                    if (arduinoCodeFound.registered)
                    {
                        console.log("Code already registered");
                        return res.redirect("/setArduino");
                    }
                    else
                    {
                        User.updateOne({email: req.session.user.email}, {arduino: arduinoCodeFound._id}, function(error){
                            if (error)
                            {
                                console.log(error);
                                return res.redirect("/setArduino");
                            }
                            else
                            {
                                console.log("Succesfuly Updated");
                                req.session.user.arduino = arduinoCodeFound._id;
                                ArduinoData.updateOne({_id: arduinoCodeFound._id}, {registered: true, dataPresent: false, minTime: null, maxTime: null}, function(erro){
                                    if (erro)
                                    {
                                        console.log("Error Occored while updating registered status of this Arduino " + arduinoCodeFound.arduinoCode);
                                        console.log(erro);
                                        return res.redirect("/setArduino");
                                    }
                                    else
                                    {
                                        console.log("Data Updated Successfuly");
                                        return res.redirect("/setArduino");
                                    }
                                });
                            }
                        });
                    }
                }
                else
                {
                    console.log("Wrong Arduino Code");
                    return res.redirect("/setArduino");
                }
            });
        }
        else
            return res.redirect("/setArduino");
    }
    else
        return res.redirect("/login");
});

app.post("/saveData", function(req, res){

    d = new Date();
    localTime = d.getTime();
    localOffset = d.getTimezoneOffset() * 60000;
    utc = localTime + localOffset;
    offset = 5.5;
    bombay = utc + (3600000*offset);
    nd = new Date(bombay);

    const data = new Data({
        arduinoCode: req.body.arduinoCode,
        time: nd.toLocaleString(),
        temperature: req.body.temperature,
        humidity: req.body.humidity,
        presure: req.body.presure,
        windSpeed: req.body.windSpeed,
        direction: req.body.direction,
        rain: req.body.rain
    });

    ArduinoData.findOne({arduinoCode: req.body.arduinoCode}, function(error, arduinoDataFound){
        if (error)
        {
            console.log(error);
            res.send("Error");
        }
        else if (arduinoDataFound)
        {
            if (arduinoDataFound.registered)
            {
                if (arduinoDataFound.dataPresent)
                {
                    ArduinoData.updateOne({arduinoCode: req.body.arduinoCode, maxTime: nd.toLocaleString()}, function(error){
                        if (error)
                        {
                            console.log(error);
                            res.send("Error");
                        }
                        else 
                        {
                            console.log("Data Added Successfully");
                            data.save();
                            res.send("Success");
                        }
                    });
                }
                else
                {
                    ArduinoData.updateOne({arduinoCode: req.body.arduinoCode, dataPresent: true, minTime: nd.toLocaleString(), maxTime: nd.toLocaleString()}, function(error){
                        if (error)
                        {
                            console.log(error);
                            res.send("Error");
                        }
                        else 
                        {
                            console.log("Data Added Successfully");
                            data.save();
                            res.send("Success");
                        }
                    });
                }
            }
            else
            {
                console.log("Arduino Not Registered");
                res.send("Error");
            }
        }
        else
        {
            console.log("No Data Found For Arduino Code === " + req.body.arduinoCode);
            res.send("Error");
        }
    });
});

app.listen(process.env.PORT, function(){
    console.log("Server has started on port " + process.env.PORT)
});