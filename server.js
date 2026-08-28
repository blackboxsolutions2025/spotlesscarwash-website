// 1. Load hidden settings from the .env file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// 2. Expose the entire 'Pages' directory so sibling folders are accessible
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));

// Also serve the root files safely if your main login assets need a fallback
app.use(express.static(path.join(__dirname, 'Pages')));

app.use(express.static(path.join(__dirname, 'Pages', 'LoginPage')));

// 3. Keep your root route serving the login page properly when visiting http://localhost:3000/
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'LoginPage', 'login.html'));
});


// 4. Connect to the Aiven MySQL Database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    timezone: '+08:00' // Tells Node.js driver how to read retrieved timestamps
});

// FIX: Force the Aiven DB database session itself to write in UTC+8
db.query("SET time_zone = '+08:00';", (err) => {
    if (err) {
        console.error("Error setting Aiven database session timezone:", err);
    } else {
        console.log("Aiven Database session successfully synced to Philippine Time (+08:00).");
    }
});


// 5. Test the database connection
db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected securely to Aiven MySQL Database!");
});


// ==========================================
// PROFILE API ROUTES
// ==========================================

app.get('/api/profile', (req, res) => {
    const { userID } = req.query;

    if (!userID) {
        return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });
    }

    const profileQuery = `
        SELECT FirstName, MiddleName, LastName, MobileNumber, Username, PlateNumber, CreatedAt, UpdatedAt
        FROM WebCustomers 
        WHERE UserID = ? 
        LIMIT 1
    `;

    db.query(profileQuery, [userID], (err, results) => {
        if (err) {
            console.error("Fetch profile database error:", err);
            return res.status(500).json({ error: 'Database system processing failure' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User profile context not found.' });
        }

        res.json(results[0]);
    });
});

app.put('/api/profile', (req, res) => {
    // Destructures incoming update keys mapped via frontend including currentPassword authentication validations
    const { userID, username, currentPassword, newPassword } = req.body;

    if (!userID) {
        return res.status(401).json({ message: 'User authorization credentials invalid or expired.' });
    }

    if (username !== undefined && username.trim() === '') {
        return res.status(400).json({ field: 'username', message: 'Username field cannot be left blank.' });
    }

    const fetchUserSql = 'SELECT Password, Username FROM WebCustomers WHERE UserID = ? LIMIT 1';
    
    db.query(fetchUserSql, [userID], (err, users) => {
        if (err) {
            console.error("Database user fetch error during update:", err);
            return res.status(500).json({ message: 'Database transactional runtime error prevented execution.' });
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'User account mapping missing.' });
        }

        const currentUserRecord = users[0];
        let updates = [];
        let queryParams = [];

        // Evaluates Username modification tracks safely 
        const processUsernameUpdate = () => {
            if (username && username.trim() !== currentUserRecord.Username) {
                const cleanedUsername = username.trim();
                const checkCollisionSql = 'SELECT UserID FROM WebCustomers WHERE Username = ? AND UserID != ? LIMIT 1';
                
                db.query(checkCollisionSql, [cleanedUsername, userID], (collisionErr, collisions) => {
                    if (collisionErr) {
                        console.error("Username conflict validation check failure:", collisionErr);
                        return res.status(500).json({ message: 'Database validation fault.' });
                    }

                    if (collisions.length > 0) {
                        return res.status(400).json({ field: 'username', message: 'This username is already taken.' });
                    }

                    updates.push('Username = ?');
                    queryParams.push(cleanedUsername);
                    processPasswordUpdate();
                });
            } else {
                processPasswordUpdate();
            }
        };

        // Directly processes password changes checking currentPassword matching parameters securely
        const processPasswordUpdate = () => {
            if (newPassword) {
                if (!currentPassword) {
                    return res.status(400).json({ field: 'password', message: 'Verification password must be supplied.' });
                }
                
                // Primary validation block ensuring parameters align with database matches
                if (currentPassword !== currentUserRecord.Password) {
                    return res.status(400).json({ field: 'password', message: 'The current password entered is incorrect.' });
                }

                updates.push('Password = ?');
                queryParams.push(newPassword);
            }

            executeDatabaseUpdate();
        };

        const executeDatabaseUpdate = () => {
            if (updates.length === 0) {
                return res.status(400).json({ message: 'No configuration parameters were altered.' });
            }

            queryParams.push(userID);
            const updateSql = `UPDATE WebCustomers SET ${updates.join(', ')} WHERE UserID = ?`;

            db.query(updateSql, queryParams, (updateErr, result) => {
                if (updateErr) {
                    console.error("Profile modification update system execution crash:", updateErr);
                    return res.status(500).json({ message: 'Internal system database write action fault.' });
                }
                res.json({ success: true, message: 'Account configuration metrics successfully updated.' });
            });
        };

        // Initialize modification lookup loops execution chain
        processUsernameUpdate();
    });
});

app.post('/api/login', (req, res) => {
    // Destructure plateNumber (which now acts as the general identifier) and password
    const { plateNumber, password } = req.body;

    // UPDATED QUERY: Check if the incoming identifier matches either PlateNumber OR Username
    const authQuery = `
        SELECT UserID, PlateNumber
        FROM WebCustomers
        WHERE (PlateNumber = ? OR Username = ?) AND Password = ?
    `;

    // Pass the input value twice to fill both the PlateNumber and Username parameters
    db.query(authQuery, [plateNumber, plateNumber, password], (err, results) => {
        if (err) {
            console.error("Login database error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        if (results.length > 0) {
            const userID = results[0].UserID;

            // Fetch the status of the user's most recent booking slot
            const bookingStatusQuery = `
                SELECT Status 
                FROM WebBookings 
                WHERE UserID = ? 
                ORDER BY BookingDate DESC, BookingTime DESC 
                LIMIT 1
            `;

            db.query(bookingStatusQuery, [userID], (bookingErr, bookingResults) => {
                if (bookingErr) {
                    console.error("Booking status check database error:", bookingErr);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to check booking status."
                    });
                }

                // Default status if no bookings have ever been made by this customer
                let latestStatus = 'None'; 
                
                if (bookingResults.length > 0) {
                    latestStatus = bookingResults[0].Status;
                }

                // Return success along with the tracking variables
                res.json({
                    success: true,
                    userID: userID,
                    latestBookingStatus: latestStatus
                });
            });

        } else {
            res.json({
                success: false,
                message: "Wrong Credentials or Password!"
            });
        }
    });
});

// GET Route: Pull confirmed conflicting reservations from the database table
app.get('/api/bookings/busy-slots', (req, res) => {
    const { date } = req.query; 
    if (!date) return res.status(400).json({ error: 'Target query parameters invalid or missing' });

    const sqlQuery = `
        SELECT BookingTime 
        FROM WebBookings 
        WHERE BookingDate = ? AND Status = 'Confirmed'
    `;

    db.query(sqlQuery, [date], (err, rows) => {
        if (err) {
            console.error("Fetch busy slots error:", err);
            return res.status(500).json({ error: 'Database system processing failure' });
        }
        const bookedTimes = rows.map(row => row.BookingTime);
        res.json({ bookedTimes });
    });
});


// POST Route: Save appointment data fields securely on database
app.post('/api/bookings/create', (req, res) => {
    const { bookingDate, bookingTime, userID } = req.body;

    // Server-side validation layer tracking incoming parameters explicitly
    if (!userID) return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });
    if (!bookingDate || !bookingTime) return res.status(400).json({ error: 'Missing appointment details.' });

    // 1. Check if the user already has an active 'Confirmed' booking
    const activeBookingCheckSql = `
        SELECT BookingID FROM WebBookings 
        WHERE UserID = ? AND Status = 'Confirmed'
    `;

    db.query(activeBookingCheckSql, [userID], (activeErr, activeRecords) => {
        if (activeErr) {
            console.error("Active booking check error:", activeErr);
            return res.status(500).json({ error: 'Database verification fault.' });
        }

        // Return error if they already have a confirmed, uncompleted appointment
        if (activeRecords.length > 0) {
            return res.status(400).json({ 
                error: 'The same car can only book 1 appointment at a time. Please complete your existing booking first.' 
            });
        }

        // 2. Proceed with checking if the chosen specific time slot is already taken by someone else
        const checkSql = `
            SELECT BookingID FROM WebBookings 
            WHERE BookingDate = ? AND BookingTime = ? AND Status = 'Confirmed'
        `;

        db.query(checkSql, [bookingDate, bookingTime], (err, existingRecords) => {
            if (err) {
                console.error("Check booking conflict error:", err);
                return res.status(500).json({ error: 'Database conflict validation fault.' });
            }

            if (existingRecords.length > 0) {
                return res.status(409).json({ error: 'This time block was booked a second ago! Choose another slot.' });
            }

            // 3. Complete insertion since both validation parameters passed
            const insertSql = `
                INSERT INTO WebBookings (UserID, BookingDate, BookingTime, Status)
                VALUES (?, ?, ?, 'Confirmed')
            `;

            db.query(insertSql, [userID, bookingDate, bookingTime], (insertErr, result) => {
                if (insertErr) {
                    console.error("Insert booking error:", insertErr);
                    return res.status(500).json({ error: 'Internal system database write action fault.' });
                }
                res.json({ success: true, message: 'Reservation transaction stored.' });
            });
        });
    });
});

// GET Route: Fetch the latest booking along with profile details for the logged-in user
app.get('/api/bookings/my-booking', (req, res) => {
    const { userID } = req.query;
    
    if (!userID) {
        return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });
    }

    const sqlQuery = `
        SELECT 
            b.BookingID, 
            b.BookingDate, 
            b.BookingTime, 
            b.Status, 
            b.CreatedAt AS BookingCreatedAt,
            c.FirstName, 
            c.MiddleName, 
            c.LastName, 
            c.PlateNumber, 
            c.MobileNumber
        FROM WebBookings b
        INNER JOIN WebCustomers c ON b.UserID = c.UserID
        WHERE b.UserID = ?
        ORDER BY b.BookingDate DESC, b.BookingTime DESC
        LIMIT 1
    `;

    db.query(sqlQuery, [userID], (err, rows) => {
        if (err) {
            console.error("Fetch client booking dashboard error:", err);
            return res.status(500).json({ error: 'Database system processing failure' });
        }

        // --- FIXED: Changed 404 Status to 200 OK with noBooking flag payload ---
        if (rows.length === 0) {
            return res.status(200).json({ noBooking: true, message: 'No current reservations found for this customer account.' });
        }

        res.json(rows[0]);
    });
});

// 7. Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});