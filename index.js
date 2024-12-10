const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Session and Passport setup
passport.use(
  new GoogleStrategy(
    {
      clientID:process.env.GOOGLE_CLIENT_ID
        ,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "http://localhost:3000/auth/google/callback",
    },
    (token, tokenSecret, profile, done) => {
      return done(null, profile);
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
app.use(express.static("public"));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');


// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname+"/public/login.html")
});

app.get('/chat', (req, res) => {
  if (req.isAuthenticated()) {
    const name = req.user.displayName;
    const pic = req.user.photos[0].value; // Corrected property
    res.render('chat', { name: name, pic: pic });
  } else {
    res.redirect("/");
  }
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/chat');  // Redirect to the main page (chat) after successful login
  });
io.on('connection', (socket) => {

    socket.on('join', (username,pic) => {
        socket.username = username;
        socket.pic = pic
        io.emit('joined', `${username} joined the chat`);
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', `<img src='${socket.pic}' 
            width='50' height='50' style='border-radius:50%'/>${socket.username}: ${msg}`);
    });

    socket.on('disconnect', () => {
        if(socket.username != undefined){
            io.emit('chat message', `${socket.username} left the chat`);
        }
    });
});
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});