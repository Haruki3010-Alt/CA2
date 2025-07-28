const express = require('express');
const mysql = require('mysql2');
const session = require('express-session'); 
const flash = require('connect-flash');
const multer = require('multer');
const app = express(); 


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Folder where images will be saved
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Keep original file name
    }
});

const upload = multer({ storage: storage });

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

// Home route
// Define routes
app.get('/',  (req, res) => {
    res.render('index', {user: req.session.user} );
});


// Login & Signup
// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.roles === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/rental');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, license, roles } = req.body;

    if (!username || !email || !password || !address || !contact || !license || !roles) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 8) {
        req.flash('error', 'Password should be at least 8 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

//route for registration
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {

    const { username, email, password, address, contact, license, roles } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, license, roles) VALUES (?, ?, SHA1(?), ?, ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, license, roles], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

//route for login
app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; 
            req.flash('success', 'Login successful!');
            if(req.session.user.role == 'user')
                res.redirect('/rental');
            else
                res.redirect('/carInventory');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});
// route for Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
// Create Item

app.get('/addCar', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addCar', {user: req.session.user } ); 
});

app.post('/addCar', upload.single('image'),  (req, res) => {
    // Extract product data from the request body
    const { name, price, status} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }

    const sql = 'INSERT INTO cars (name, price, status, image) VALUES (?, ?, ?, ?)';
    // Insert the new product into the database
    db.query(sql , [name, price, status, image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding vehicle:", error);
            res.status(500).send('Error adding vehicle');
        } else {
            // Send a success response
            res.redirect('/carInventory');
        }
    });
});

app.get('/carInventory', checkAuthenticated, checkAdmin, (req, res) => {
    const search = req.query.search;
    let sql = 'SELECT * FROM cars';
    let params = [];

    if (search) {
        sql += ' WHERE name LIKE ?';
        params.push('%' + search + '%');
    }

    db.query(sql, params, (error, results) => {
        if (error) throw error;
        res.render('carInventory', {
            cars: results,
            user: req.session.user,
            search: search || ''
        });
    });
});


// View Items
app.get('/car/:id', checkAuthenticated, (req, res) => {
    const carID = req.params.id;
    const sql = 'SELECT * FROM cars WHERE carID = ?';
    
    db.query(sql, [carID], (err, result) => {
        if (err) {
            console.error('Error fetching car details:', err);
            return res.status(500).send('Error fetching car details');
        }
        if (result.length > 0) {
            res.render('car', { car: result[0], user: req.session.user });
        } else {
            res.status(404).send('Car not found');
        }
    });
});


// Update Item
app.get('/car/updateCar/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const carID = req.params.id;
    const sql = 'SELECT * FROM cars WHERE carID = ?';
    if (search) {
        sql += ' AND name LIKE ?';
        params.push('%' + search + '%');
    }


    db.query(sql, [carID], (err, result) => {
        if (err) {
            console.error('Error fetching car for edit:', err);
            return res.status(500).send('Error fetching car details');
        }
        if (result.length > 0) {
            res.render('updateCar', { car: result[0], user: req.session.user, search: search || '' });
        } else {
            res.status(404).send('Car not found');
        }
    });
});


app.post('/car/updateCar/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res) => {
    const carID = req.params.id;
    const { name, price, status } = req.body;
    let image = req.file ? req.file.filename : null;

    const sql = image
        ? 'UPDATE cars SET name = ?, price = ?, status = ?, image = ? WHERE carID = ?'
        : 'UPDATE cars SET name = ?, price = ?, status = ? WHERE carID = ?';

    const params = image
        ? [name, price, status, image, carID]
        : [name, price, status, carID];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating car:', err);
            return res.status(500).send('Error updating car');
        }
        res.redirect('/carInventory');
    });
});



// Delete Item
app.post('/car/delete/:id', (req,res) => {
    const carID = req.params.id;

    const sql = 'DELETE FROM cars WHERE carID = ?';
    db.query(sql, [carID], (err, result) => {
        if (err) {
            console.error('Error deleting car:', err);
            return res.status(500).send('Error deleting');
        }
        res.redirect('/carInventory'); 
    });
});
// Search/Filter items
app.get('/rental', checkAuthenticated, (req, res) => {
    const search = req.query.search;

    let sql = 'SELECT * FROM cars WHERE status = "available"';
    let params = [];

    if (search) {
        sql += ' AND name LIKE ?';
        params.push('%' + search + '%');
    }

    db.query(sql, params, (error, results) => {
        if (error) throw error;
        res.render('rental', { car: results, user: req.session.user, search: search || '' });
    });
});






// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
