var fs = require('fs');
var path = require('path');

var express = require('express');
var formidable = require('formidable');

var app = express();

var server = app.listen(3000);
var io = require('socket.io').listen(server);

var workspaces = [];

Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

app.use(express.static(__dirname + '/public'));

// Create a new workspace
app.use('/ws/:id/create', function(req, res) {
    res.sendFile(__dirname + '/public/create.html');
    console.log(req.files);
    console.log('create workspace ' + req.params.id);
    // Create a directory for the workspace
    fs.mkdir(__dirname + '/workspaces/' + req.params.id, function(e) {
        if (!e || (e && e.code === 'EEXIST')) {
            // nothing to create - forward to existing url?
        } else {
            // problem occurred
            console.log(e);
        }
    });
});

// Upload a file to a workspace
app.post('/ws/:id/upload', function(req, res) {
    console.log('upload workspace ' + req.params.id);
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var old_path = files.file.path,
            file_size = files.file.size,
            file_ext = files.file.name.split('.').pop(),
            index = old_path.lastIndexOf('/') + 1;
        if (index == 0)
            index = old_path.lastIndexOf('\\') + 1;
        
        // Get the file name and its destination workspace path
        var file_name = old_path.substr(index),
            new_path = path.join(__dirname, '/workspaces/', req.params.id);
 
        // Ensure the target path doesn't already exist
        fs.mkdir(new_path, function(err) {
            if (!err || (err && err.code === 'EEXIST')) {
                new_path = path.join(new_path, files.file.name);
                // Move the file to the workspace
                fs.readFile(old_path, function(err, data) {
                    fs.writeFile(new_path, data, function(err) {
                        console.log(err);
                        fs.unlink(old_path, function(err) {
                            if (err) {
                                res.status(500);
                                res.json({'success': false});
                            } else {
                                res.status(200);
                                res.json({'success': true});
                        
                                // Set the file info for the owkrspace
                                workspaces[req.params.id] = {fileName: files.file.name,
                                                             fileSize: files.file.size,
                                                             sections: [],
                                                             threads: [],
                                                             data: []
                                                            };
                                
                                // Create a default workspace Lens
                                workspaces[req.params.id].sections[0] = {
                                    currentLens: "HexLens",
                                    startOffset: 0,
                                    endOffset: files.file.size,
                                    lenses: [],
                                    lensSettings: []
                                };
                                
                                // Send the uploaded file info to everyone connected to the  workspace
                                io.to(req.params.id).emit('fileContents', { buffer: data, fileName: workspaces[req.params.id].fileName, fileSize: workspaces[req.params.id].fileSize });
                        
                                console.log('---- File Upload Reset WS ----');
                                console.log(workspaces[req.params.id]);
                                
                                saveWorkspace(req.params.id);
                            }
                        });
                    });
                });
            } else {
                console.log(err);
            }
        });
    });
});

// Fetch a workspace
app.use('/ws/:id', function(req, res) {
    res.sendFile(__dirname + '/public/app.html');
    // See if the workspace exists in the list of loaded spaces
    if (typeof workspaces[req.params.id] === typeof undefined) {
        // Try loading the workspace if it isn't already loaded
        fs.readFile('spaces/' + req.params.id + '.appcfg', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            workspaces[req.params.id] = JSON.parse(data);
            workspaces[req.params.id].threads = [];
            console.log(data);
        });
    }
    console.log('workspace ' + req.params.id);
});

// Create a new workspace
app.use('/create', function(req, res) {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var string_length = 10;
    var randomstring = '';
    
    // Generate a random workspace ID
    for (var i = 0; i < string_length; i++) 
    {
        randomstring += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('create workspace ' + randomstring);
    
    // Create a directory for the new workspace
    fs.mkdir(__dirname + '/workspaces/' + randomstring, function(e) {
        if (!e) {
            console.log('success');
            res.redirect('/ws/' + randomstring + '/');
        } else if (e && e.code === 'EEXIST') {
            console.log('already exists');
            res.redirect('/create');
        } else {
            // problem occurred
            console.log(e);
        }
    });
});

// Default home page, allowing creation of a new workspace
app.use('/', function(req, res) {
    res.sendFile(__dirname + '/public/create.html');
});

/**
Helper Functions
**/

// Finds a section in a workspace
function findSection(offset, ws) {
    for (var i = 0; i < ws.sections.length; i++) {
        if (offset >= ws.sections[i].startOffset && offset < ws.sections[i].endOffset)
            return ws.sections[i];
    }
}

// Merges sections in a workspace
function mergeSection(sectionStart, ws) {
    var sectionIndex = -1;
    for (var i = 0; i < ws.sections.length; i++) 
    {
        if (sectionStart === ws.sections[i].startOffset)
        {
            sectionIndex = i;
            break;
        }
    }
    
    if (sectionIndex <= 0) return false;
    
    ws.sections[sectionIndex-1].endOffset = ws.sections[sectionIndex].endOffset;
    
    ws.sections.splice(sectionIndex, 1);
    
    return true;
}

// Splits a section into two
function splitSection(splitOffset, ws) {
    var sectionIndex = -1;
    for (var i = 0; i < ws.sections.length; i++) 
    {
        if (splitOffset >= ws.sections[i].startOffset && splitOffset < ws.sections[i].endOffset)
        {
            sectionIndex = i;
            break;
        }
    }
    
    if (sectionIndex === -1) return false;
    
    if (ws.sections[sectionIndex].startOffset >= splitOffset) return false;
    
    var newSection = {};
    newSection.sectionName = ws.sections[i].sectionName;
    newSection.startOffset = splitOffset;
    newSection.endOffset = ws.sections[i].endOffset;
    newSection.lenses = [];
    
    // Copy old lens settings for use in the new lens
    var newLensSettings = [];
    for (var k in ws.sections[i].lensSettings) {
        newLensSettings[k] = ws.sections[i].lensSettings[k];
        console.log('copied ' + k + ' with val ' + ws.sections[i].lensSettings[k]);
    }
    newSection.lensSettings = newLensSettings;
    console.log('Old section settings: ');
    console.log(ws.sections[i].lensSettings);
    console.log('Lens Settings for New: ');
    console.log(newSection.lensSettings);
    
    var currLens = ws.sections[i].currentLens;
    ws.sections[sectionIndex].endOffset = splitOffset;
    
    newSection.currentLens = currLens;
    
    ws.sections.splice(sectionIndex+1, 0, newSection);
    
    return true;
}

// Send a list of sections to a particular user
function sendSectionList(socket) {
    var sL = [];
    var wsSections = workspaces[socket.workspace].sections;
    for (var i = 0; i < wsSections.length; i++) {
        sL.push({
            currentLens: wsSections[i].currentLens,
            startOffset: wsSections[i].startOffset,
            endOffset: wsSections[i].endOffset,
            lenses: [],
            lensSettings: []
        });
        for (var k in wsSections[i].lensSettings) {
            sL[sL.length-1].lensSettings.push({key: k, val: wsSections[i].lensSettings[k]});
        }
        console.log('Lens Settings for Section: ');
        console.log(sL[sL.length-1].lensSettings);
    }
    io.to(socket.id).emit('sectionList', sL);
    
    //for (var i = 0; i < wsSections.length; i++) {
        //for (var j = 0; j < wsSections[i].lenses.length; j++) {
            //io.to(socket.id).emit('sectionList', sL);
            //{section: sec.startOffset, lens: sec.currentLens, settings: data}
        //}
    //}
}

// Send comment threads to user
function sendThreads(socket) {
    var tL = [];
    var ws = workspaces[socket.workspace];
    for (var i = 0; i < ws.threads.length; i++) {
        if (threadExists(i, ws)) {
                    tL.push({index: i, summary: ws.threads[i].summary, discussion: ws.threads[i].discussion});
        }
    }
    
    io.to(socket.id).emit('threadList', tL);
}

// Serialize workspace info and settings to disk
function saveWorkspace(wsID) {
    fs.writeFile('spaces/' + wsID + '.appcfg', JSON.stringify(workspaces[wsID]), 'utf8', function (err,data) {
        if (err) return console.log(err);
    });
}

// Set comment thread summary/tooltip text
function setThreadSummary(threadOffset, newSummary, ws) {
    ws.threads[threadOffset].summary = newSummary;
}

// Check if a comment thread exists
function threadExists(threadOffset, ws) {
    return typeof ws.threads[threadOffset] != 'undefined';
}

// Get a comment thread
function getThread(threadOffset, ws) {
    if (typeof ws.threads[threadOffset] != 'undefined') {
        return ws.threads[threadOffset];
    }
}

// Add a comment to a thread
function addComment(cData, socket) {
    var ws = workspaces[socket.workspace];
    
    var newComment = {author: socket.userName, comment: cData.comment};
    
    if (threadExists(cData.threadOffset, ws)) {
        ws.threads[cData.threadOffset].discussion.push(newComment); 
    } else {
        ws.threads[cData.threadOffset] = {summary: newComment.comment.substring(0, 40), discussion: []};
        ws.threads[cData.threadOffset].discussion.push(newComment);
    }
    
    console.log("-------Thread State--------");
    console.log(ws.threads[cData.threadOffset]);
    console.log("---------------------------");
}

/**
Socket functions
**/

// New user connection
io.sockets.on('connection', function(socket) {
    console.log('A new user connected!');
    console.log(socket.request.headers.referer);
    
    socket.userName = "unnamed";
    
    var pathArray = socket.request.headers.referer.split('/');
    for (i = 0; i < pathArray.length; i++) {
        // Send workspace info if they joined a valid workspace
        if (pathArray[i] === 'ws' && (i + 1 < pathArray.length))
        {
            socket.workspace = pathArray[i+1];
            socket.join(socket.workspace);
            console.log('user joined workspace id: ' + socket.workspace);
            socket.broadcast.to(socket.workspace).emit('userjoin', { msg: 'user joined' });
            
            
            if (typeof workspaces[socket.workspace] !== 'undefined') {
            
                var file_path = path.join(__dirname, '/workspaces/', socket.workspace, workspaces[socket.workspace].fileName);
            
                console.log(file_path);
                fs.readFile(file_path, function(err, data) {
                    io.to(socket.id).emit('fileContents', { buffer: data, fileName: workspaces[socket.workspace].fileName, fileSize: workspaces[socket.workspace].fileSize }); 
                    
                    sendSectionList(socket);
                    sendThreads(socket);
                });
            }
        }
    }    
    
    // Set a username
    socket.on('setUsername', function(data) {
        console.log('----set username----');
        console.log(data);
        socket.userName = data.name;
        console.log('---------------------');
    });
    
    // Split a section
    socket.on('split', function(data) {
        console.log('----section split----');
        console.log(data);
        if (splitSection(data.splitOffset, workspaces[socket.workspace]))
            io.to(socket.workspace).emit('split', data);
        console.log('---------------------');
        saveWorkspace(socket.workspace);
    });
    
    // Merge sections
    socket.on('merge', function(data) {
        console.log('----section merge----');
        console.log(data);
        if (mergeSection(data.sectionStart, workspaces[socket.workspace]))
            io.to(socket.workspace).emit('merge', data);
        console.log('---------------------');
        saveWorkspace(socket.workspace);
    });
    
    // Change to a different lens for a section
    socket.on('lensChange', function(data) {
        console.log('----lens change----');
        console.log(data);
        findSection(data.startSection, workspaces[socket.workspace]).currentLens = data.newLens;
        io.to(socket.workspace).emit('lensChange', data);
        console.log(workspaces[socket.workspace].sections);
        console.log('---------------------');
    });
    
    // Change settings for a lens
    socket.on('changeLensSettings', function(data) {
        console.log('----lens setting change----');
        console.log(data);
        findSection(data.section, workspaces[socket.workspace]).lensSettings[data.lens] = JSON.stringify(data.settings);
        console.log(findSection(data.section, workspaces[socket.workspace]).lensSettings);
        io.to(socket.workspace).emit('changeLensSettings', data);
        console.log(workspaces[socket.workspace].sections);
        console.log('---------------------');
    });
    
    // Add a comment to a thread
    socket.on('addComment', function(data) {
        console.log('----addComment----');
        data.author = socket.userName;
        addComment(data, socket);
        io.to(socket.workspace).emit('addComment', data);
        console.log('---------------------');
    });
    
    // Set a thread summary
    socket.on('setThreadSummary', function(data) {
        console.log('----setThreadSummary----');
        setThreadSummary(data.threadOffset, data.summary, workspaces[socket.workspace]);
        io.to(socket.workspace).emit('setThreadSummary', data);
        console.log('---------------------');
    });
    
    // Send a section list in response to a client request
    socket.on('requestSectionList', function() {
        console.log('----requestSectionList----');
        sendSectionList(socket);
        console.log('---------------------');
    });
    
    // User has disconnected
    socket.on('disconnect', function() {
        console.log('A user has disconnected!');
    });
});


//app.get('/[0-9a-fA-F]+', function(req, res){
//    res.sendFile(__dirname + '/index.html');
//});