var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');

var app = express();

var jsonParser = bodyParser.json();

// Add your API endpoints here
app.route('/users')
    .get(function(req, res){
        User.find({}, function(err, users){
            if (err) return res.status(500).json(err);
    
            res.json(users);        
        });
    })

    .post(jsonParser, function(req, res){
        if (!req.body.username) return res.status(422).json({ message: "Missing field: username" });
        if (typeof req.body.username !== 'string') return res.status(422).json({ message: "Incorrect field type: username" });
        
        User.create({ username: req.body.username }, function(err, user){
            res.status(201).location('/users/' + user._id).json({});
        });
    });

app.route('/users/:userId')
    .get(function(req, res){
        User.findOne({ _id: req.params.userId })
            .exec(function(err, user){
                if (!user) return res.status(404).json({ message: "User not found" });
                
                return res.json(user);
            });
    })

    .put(jsonParser, function(req, res){
        if (!req.body.username) return res.status(422).json({ message: "Missing field: username" });
        if (typeof req.body.username !== 'string') return res.status(422).json({ message: "Incorrect field type: username" });
        
        User.findOneAndUpdate({ _id: req.params.userId }, { username: req.body.username })
            .then(function(user){
                if (!user) {
                    User.create({ _id: req.params.userId, username: req.body.username })
                        .then(function(){
                            return res.json({});
                        });
                }

                return res.json({});
            });
    })
    
    .delete(function(req, res){
        User.findOneAndRemove({ _id: req.params.userId })
            .then(function(user){
                if (!user) return res.status(404).json({ message: "User not found" });
                
                return res.json({});
            });
    });
    
app.route('/messages')    
    .get(function(req, res){
        Message.find(req.query)
            .populate('from to')
            .then(function(messages){
                return res.json(messages);
            });
    })
    
    .post(jsonParser, function(req, res){
        if (!req.body.text) return res.status(422).json({ message: "Missing field: text" });
        if (typeof req.body.text !== 'string') return res.status(422).json({ message: "Incorrect field type: text" });
        if (typeof req.body.to !== 'string') return res.status(422).json({ message: "Incorrect field type: to" });
        if (typeof req.body.from !== 'string') return res.status(422).json({ message: "Incorrect field type: from" });

        User.findOne({ _id: req.body.to })
            .then(function(user){
                console.log('after find req to:', user);
                if (!user) return res.status(422).json({ message: "Incorrect field value: to" });

                return User.findOne({ _id: req.body.from });
            })
            .then(function(user){
                if (!user) return res.status(422).json({ message: "Incorrect field value: from" });

                return Message.create({ text: req.body.text, to: req.body.to, from: req.body.from });
            })
            .then(function(message){
                return res.status(201).location(`/messages/${message._id}`).json({});
            });
    });
    
app.route('/messages/:messageId')
    .get(function(req, res){
        Message.findOne({ _id: req.params.messageId })
            .populate('from to')
            .then(function(message){
                if (!message) return res.status(404).json({ message: "Message not found" });
                
                return res.json(message);
            });
    });
    


var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;

