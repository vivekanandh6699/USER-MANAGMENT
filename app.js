//app.js

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const hbs = require('express-handlebars');
const action = require("./views/action")
const path = require('path');

// Import the app instance from action.js
//const actionApp = require('./views/action');//

const app = express();
const port = 8080;

//app.use((req, res, next) => {
// res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//res.setHeader('Pragma', 'no-cache');
//res.setHeader('Expires', '0');
// next();
//});

// Connect to MongoDB
mongoose.connect('mongodb://localhost/employee', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;


//const setCacheControlHeaders = (req, res, next) => {
// Prevent caching
// res.setHeader('Cache-Control', 'no-store, must-revalidate');

// Continue to the next middleware
//next();
//};
// Create a Mongoose schema and model for user
const UserSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Add this line
  name: String,
  email: String,
  number: String,
  password: String,
});

let User = mongoose.model('User', UserSchema);

// Use the app instance from action.js as middleware
//app.use('/action', actionApp);//

// Configure body-parser
app.use(bodyParser.urlencoded({ extended: false }));

// Configure session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
})
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});



app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.userId = req.session.user._id; // Assuming _id is the user's unique identifier
  }
  next();
});


// Configure Handlebars as the view engine
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

// Middleware to check if the user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', isLoggedIn, async (req, res) => {
  try {
    // Fetch user data specific to the logged-in user and render the home page
    const users = await User.find({ userId: res.locals.userId }).exec();
    res.render('home', { users });
  } catch (err) {
    console.error(err);
    res.render('home', { error: 'An error occurred while fetching data.' });
  }
});

// Modify other routes accordingly, ensuring to set userId when saving data

app.get('/add', isLoggedIn, (req, res) => {
  res.render('add');
});



app.post('/add', isLoggedIn, [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').notEmpty().isEmail().withMessage('Invalid email'),
  check('number').notEmpty().withMessage('Number is required'),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.render('add', { errors: errors.array() });
  } else {
    const { name, email, number } = req.body;

    try {
      // Retrieve the userId from the session
      const userId = req.session.user._id;

      // Create a new User instance with the associated userId
      const newUser = new User({ userId, name, email, number });

      // Save the new user data
      await newUser.save();

      // Redirect to the homepage
      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.render('add', { error: 'An error occurred while adding data.' });
    }
  }
});


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password }).exec();

    if (!user) {
      res.render('login', { error: 'Invalid email or password' });
    } else {
      req.session.user = user;
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'An error occurred during login' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

// Registration route
app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/action', (req, res) => {
  res.render('register');
});

// Handle deletion
app.get('/delete/:id', isLoggedIn, async (req, res) => {
  const userId = req.params.id;

  try {
    await User.deleteOne({ _id: userId }).exec();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('home', { error: 'An error occurred while deleting data.' });
  }
});

// Registration form submission
app.post('/register', [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').notEmpty().isEmail().withMessage('Invalid email'),
  check('number').notEmpty().withMessage('Number is required'),
  check('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.render('register', { errors: errors.array() });
  } else {
    const { name, email, number, password } = req.body;

    try {
      const newUser = new User({ name, email, number, password });
      await newUser.save();
      res.redirect('/login');
    } catch (error) {
      console.error(error);
      res.render('register', { error: 'An error occurred while registering.' });
    }
  }
});

// Edit page
app.get('/edit/:id', isLoggedIn, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).exec();

    if (user) {
      res.render('edit', { user });
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.render('home', { error: 'An error occurred while fetching user data for editing.' });
  }
});

// Handle form submissions for editing
app.post('/edit/:id', isLoggedIn, [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').notEmpty().isEmail().withMessage('Invalid email'),
  check('number').notEmpty().withMessage('Number is required'),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const userId = req.params.id;
    const user = await User.findById(userId).exec();
    return res.render('edit', { user, errors: errors.array() });
  }

  const userId = req.params.id;
  const { name, email, number } = req.body;

  try {
    const user = await User.findById(userId).exec();

    if (user) {
      user.name = name;
      user.email = email;
      user.number = number;
      await user.save();
      res.redirect('/');
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.render('home', { error: 'An error occurred while saving user changes.' });
  }
});



//app.use("", require("./views/action"));//

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
