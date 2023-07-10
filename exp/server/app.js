var debug = require('debug')('angular2-nodejs:server');
var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var appRoutes = require('./routes/app');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
  next();
});

app.use('/', appRoutes);

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);

var io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: '*'
  }
});

var chatRooms = {
  Lobby: []
}

io.on('connection',(socket)=>{

    console.log('new connection made.');


    socket.on('join', function(data){
      socket.join(data.room);

      console.log(data.user + 'joined the room : ' + data.room);
      socket.username = data.user;
      socket.emit('get chat', chatRooms[data.room]);

      socket.broadcast.to(data.room).emit('new user joined', {user:data.user, message:' has joined this room.'});
      console.log(getUsers(data.room));
      io.in(data.room).emit('data-updated', getUsers(data.room));
    });

    socket.on('leave', function(data){
    
      console.log(data.user + 'left the room : ' + data.room);

      socket.broadcast.to(data.room).emit('left room', {user:data.user, message:'has left this room.'});

      socket.leave(data.room);
      console.log(getUsers(data.room));
      io.in(data.room).emit('data-updated', getUsers(data.room));
    });

    socket.on('message',function(data){
      chatRooms.Lobby.push({user:data.user, message:data.message});
      io.in(data.room).emit('new message', {user:data.user, message:data.message});
    })
});

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function getUsers(roomId) {
  let users = []
  let clients_in_the_room = io.sockets.adapter.rooms.get(roomId);
  if (clients_in_the_room) {
    for (let clientId of Array.from(clients_in_the_room) ) {
      let socket = io.sockets.sockets.get(clientId)
      users.push(socket.username);
    }
  }
  return users
}

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
