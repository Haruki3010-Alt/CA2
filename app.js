const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();

// Database connection
const db = mysql.createConnection({
    host: 'k-a2-h.h.filess.io',
    port: 3307,
    user: 'C237CA2DB_spiritthou',
    password: '7a28e83c651e37b59fbcce4cf8118f59c64a68ad',
    database: 'C237CA2DB_spiritthou'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7}
}));

app.use(flash());

app.set('view engine', 'ejs');

// Login & Signup

// Create Item

// View Items

// Update Item

// Delete Item

// Search/Filter items

// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
