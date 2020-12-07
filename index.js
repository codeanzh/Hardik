const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get("/", function(request, response){
	response.send("index.html");
});

app.post("/saveData", function(req, res){
    let datal = {
        data: req.body.data
    }
    datal = JSON.stringify(datal);
    fs.writeFileSync('student.json', datal);
	res.redirect("saveData.html");
});

app.post("/goBack", function(req, res){
    console.log("Back Hit");
    res.redirect("index.html");
});

app.post("/showData", function(req, res){
    fs.readFile('student.json', (err, data) => {
        if (err) throw err;
        let datal = JSON.parse(data);
        res.send(datal);
    });
});

app.listen(3000, function(){
	console.log("Server Started on Port 3000");
});