
//action.js

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Example in-memory database
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', number: '1234567890' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', number: '9876543210' },
];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views')); // Assuming your static files are in a 'views' folder

// Home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/home.hbs');
});

// Add/Edit Data page
app.get('/add', (req, res) => {
  res.sendFile(__dirname + '/views/add.hbs');
});

// Edit page
app.get('/edit/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);

  if (user) {
    res.sendFile(__dirname + '/views/add.hbs');
  } else {
    res.status(404).send('User not found');
  }
});

// Handle form submissions for adding/editing
app.post('/add', (req, res) => {
  const { name, email, number } = req.body;

  // Assuming you have some validation logic here

  // If an ID is present in the request, it's an edit operation
  if (req.body.id) {
    const userId = parseInt(req.body.id);
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      users[userIndex] = { id: userId, name, email, number };
    }
  } else {
    // It's an add operation
    const newUser = {
      id: users.length + 1,
      name,
      email,
      number,
    };

    users.push(newUser);
  }

  res.redirect('/');
});

// Handle deletion
app.get('/delete/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  users = users.filter(u => u.id !== userId);

  res.redirect('/');
});

// Export the app instance
module.exports = app;

 
