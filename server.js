// 1. Load hidden settings from the .env file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());
app.use(cors());

// Secret key for signing admin JSON Web Tokens
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// 2. Expose the entire 'Pages' directory so sibling folders are accessible
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));

// Also serve the root files safely if your main login assets need a fallback
app.use(express.static(path.join(__dirname, 'Pages')));
app.use(express.static(path.join(__dirname, 'Pages', 'LoginPage')));
app.use(express.static(path.join(__dirname, 'Pages', 'AdminPage')));

// 3. Keep your root route serving the login page properly when visiting http://localhost:3000/
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'LoginPage', 'login.html'));
});

// Admin Route: Serve the login page structure or dashboard directly 
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'AdminPage', 'AdminPage.html'));
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
    timezone: '+08:00'
});

// Force the database session itself to write in UTC+8
db.query("SET time_zone = '+08:00';", (err) => {
    if (err) {
        console.error("Error setting Aiven database session timezone:", err);
    } else {
        console.log("Aiven Database session successfully synced to Philippine Time (+08:00).");
    }
});

// Test database connection
db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected securely to Aiven MySQL Database!");
});


// ==========================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ==========================================
const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.warn(`[Admin Auth Middleware] Blocked access attempt: Missing Authorization header.`);
        return res.status(401).json({ error: 'Access Denied: Missing authentication token.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        console.warn(`[Admin Auth Middleware] Blocked access attempt: Malformed Token structure.`);
        return res.status(401).json({ error: 'Access Denied: Token format invalid.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error(`[Admin Auth Middleware] JWT Verification failed: ${err.message}`);
            return res.status(403).json({ error: 'Session expired or token authentication invalid.' });
        }
        console.log(`[Admin Auth Middleware] Token authorized successfully for Admin Username: ${decoded.username} (ID: ${decoded.adminId})`);
        req.adminId = decoded.adminId;
        req.adminUsername = decoded.username;
        next();
    });
};


// ==========================================
// UNIFIED CUSTOMER & ADMIN LOGIN API ROUTE
// ==========================================
app.post('/api/login', (req, res) => {
    const { plateNumber, password } = req.body;

    console.log(`[Login API] Login initialization request received for identifier: "${plateNumber}".`);
    
    // Select the hashed password along with user details to perform decryption in Node.js
    const customerQuery = `SELECT UserID, PlateNumber, Username, Password FROM WebCustomers WHERE PlateNumber = ? OR Username = ? LIMIT 1`;

    db.query(customerQuery, [plateNumber, plateNumber], async (err, customerResults) => {
        if (err) {
            console.error("Customer authentication database fault:", err);
            return res.status(500).json({ success: false, message: "Database transactional error." });
        }

        // STEP 1: Customer record located by PlateNumber or Username
        if (customerResults.length > 0) {
            const customerRecord = customerResults[0];
            console.log(`[Login API] Customer match located successfully for UserID: ${customerRecord.UserID}. Verifying password...`);
            
            let customerMatch = false;
            try {
                // Smart Fallback Verification: Checks if password string is a bcrypt hash or clear-text string
                if (customerRecord.Password && (customerRecord.Password.startsWith('$2b$') || customerRecord.Password.startsWith('$2a$'))) {
                    customerMatch = await bcrypt.compare(password, customerRecord.Password);
                } else {
                    customerMatch = (password === customerRecord.Password);
                }
            } catch (bcryptCustomerErr) {
                console.error("Bcrypt customer password calculation error:", bcryptCustomerErr);
                return res.status(500).json({ success: false, message: "Password evaluation failure." });
            }

            if (customerMatch) {
                console.log(`[Login API] Customer verification SUCCESSFUL for UserID: ${customerRecord.UserID}. Checking booking records.`);
                const bookingStatusQuery = `SELECT Status FROM WebBookings WHERE UserID = ? ORDER BY BookingDate DESC, BookingTime DESC LIMIT 1`;

                db.query(bookingStatusQuery, [customerRecord.UserID], (bookingErr, bookingResults) => {
                    if (bookingErr) return res.status(500).json({ success: false, message: "Failed to check booking status." });
                    
                    let latestStatus = 'None';
                    if (bookingResults.length > 0) latestStatus = bookingResults[0].Status;
                    
                    // Generate a secure operational token for the customer session
                    const token = jwt.sign(
                        { userID: customerRecord.UserID, isAdmin: false },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    return res.json({ 
                        success: true, 
                        isAdmin: false, 
                        token: token,
                        userID: customerRecord.UserID, 
                        latestBookingStatus: latestStatus 
                    });
                });
            } else {
                console.warn(`[Login API] Customer login FAILED for UserID: ${customerRecord.UserID}. Incorrect password provided.`);
                return res.json({
                    success: false,
                    message: "Wrong Credentials or Password!"
                });
            }
        } else {
            // STEP 2: Fallback to verify administrative users if no customer matches
            console.log(`[Login API] No customer profile matched for identifier: "${plateNumber}". Routing lookup to administrative user accounts.`);
            const adminQuery = `SELECT AdminID, Username, Password FROM WebAdminUsers WHERE Username = ? LIMIT 1`;
            
            db.query(adminQuery, [plateNumber], async (adminErr, adminResults) => {
                if (adminErr) {
                    console.error("Admin authentication lookup database error:", adminErr);
                    return res.status(500).json({ success: false, message: "Database verification fault." });
                }

                if (adminResults && adminResults.length > 0) {
                    const adminRecord = adminResults[0];
                    console.log(`[Login API] Matching administrative account found for Username: "${adminRecord.Username}". Verifying password...`);
                    
                    let adminMatch = false;
                    try {
                        if (adminRecord.Password && (adminRecord.Password.startsWith('$2b$') || adminRecord.Password.startsWith('$2a$'))) {
                            adminMatch = await bcrypt.compare(password, adminRecord.Password);
                        } else {
                            adminMatch = (password === adminRecord.Password);
                        }
                    } catch (bcryptErr) {
                        console.error("Bcrypt administrative calculation exception error:", bcryptErr);
                        return res.status(500).json({ success: false, message: "Password evaluation failure." });
                    }

                    if (adminMatch) {
                        console.log(`[Login API] Admin authentication SUCCESSFUL for Username: "${adminRecord.Username}". Generating secure token.`);
                        const token = jwt.sign(
                            { adminId: adminRecord.AdminID, username: adminRecord.Username, isAdmin: true },
                            JWT_SECRET,
                            { expiresIn: '4h' }
                        );

                        return res.json({
                            success: true,
                            isAdmin: true,
                            token: token,
                            username: adminRecord.Username
                        });
                    } else {
                        console.warn(`[Login API] Admin login FAILED for Username: "${adminRecord.Username}". Incorrect password provided.`);
                        return res.json({
                            success: false,
                            message: "Wrong Credentials or Password!"
                        });
                    }
                } else {
                    console.log(`[Login API] Authentication processing terminated. No matches found across global identities for: "${plateNumber}".`);
                    return res.json({
                        success: false,
                        message: "Wrong Credentials or Password!"
                    });
                }
            });
        }
    });
});

// ==========================================
// ADMIN DASHBOARD BACKEND API ROUTES
// ==========================================

// GET Route: Pull all registration listings securely linked with customer mappings (Admin Only)
app.get('/api/admin/bookings', verifyAdminToken, (req, res) => {
    const sqlQuery = `
        SELECT
            b.BookingID,
            b.BookingDate,
            TIME_FORMAT(b.BookingTime, '%h:%i %p') AS BookingTime,
            b.Status,
            DATE_FORMAT(b.CreatedAt, '%b %d, %Y') AS CreatedAtDate,
            TIME_FORMAT(b.CreatedAt, '%h:%i %p') AS CreatedAtTime,
            c.UserID,
            c.FirstName,
            c.MiddleName,
            c.LastName,
            c.MobileNumber,
            c.PlateNumber
        FROM WebBookings b
        INNER JOIN WebCustomers c ON b.UserID = c.UserID
        ORDER BY b.BookingDate ASC, b.BookingTime ASC;
    `;

    db.query(sqlQuery, (err, rows) => {
        if (err) {
            console.error("Admin reservation tracking error:", err);
            return res.status(500).json({ error: 'Database dashboard tracking execution crash.' });
        }
        res.json(rows);
    });
});

app.patch('/api/admin/bookings/:bookingId/status', verifyAdminToken, (req, res) => {
    const { bookingId } = req.params;
    const { nextStatus } = req.body;
    
    // Extracted safely from the authenticated JWT object by the middleware
    const authenticatedAdminUsername = req.adminUsername; 

    // --- ADDED: CRITICAL ADMINISTRATIVE USER EXISTENCE SAFEGUARD ---
    const adminVerifySql = 'SELECT AdminID FROM WebAdminUsers WHERE Username = ? LIMIT 1';
    
    db.query(adminVerifySql, [authenticatedAdminUsername], (adminVerifyErr, adminRecords) => {
        if (adminVerifyErr) {
            console.error("Safeguard admin existence verification query crashed:", adminVerifyErr);
            return res.status(500).json({ error: 'System transactional fault lookup verification.' });
        }

        // If the username parsed from the token does not match any row in your administrative register
        if (!adminRecords || adminRecords.length === 0) {
            console.warn(`[Security Alert] Blocked state modification! Authorized token exists for user "${authenticatedAdminUsername}", but account was missing from WebAdminUsers database.`);
            return res.status(403).json({ error: 'Access Denied: Your administrator account could not be found or has been revoked.' });
        }

        // --- CONTINUE EXISTING STATUS RULES IF ACCOUNT IS VALID ---
        const allowedStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ error: 'Requested workflow target configuration parameter invalid.' });
        }

        // Look up current allocation properties safely
        const lookupSql = 'SELECT Status FROM WebBookings WHERE BookingID = ? LIMIT 1';
        db.query(lookupSql, [bookingId], (err, records) => {
            if (err) {
                console.error("Booking identification error:", err);
                return res.status(500).json({ error: 'System transactional fault lookup verification.' });
            }

            if (records.length === 0) {
                return res.status(404).json({ error: 'Target reservation key context missing.' });
            }

            const currentStatus = records[0].Status;

            // Enforce status state transition workflow rules
            if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
                return res.status(400).json({ error: `Cannot alter terminal workflows locked inside a ${currentStatus} phase.` });
            }

            if (currentStatus === 'Confirmed' && nextStatus === 'Pending') {
                return res.status(400).json({ error: 'Nonsensical reverse modifications are disallowed (Confirmed -> Pending).' });
            }

            // Complete database update
            const updateSql = 'UPDATE WebBookings SET Status = ? WHERE BookingID = ?';
            db.query(updateSql, [nextStatus, bookingId], (updateErr, result) => {
                if (updateErr) {
                    console.error("Admin booking state transaction error:", updateErr);
                    return res.status(500).json({ error: 'Internal system database write action fault.' });
                }
                res.json({ success: true, message: `Reservation status altered to '${nextStatus}' successfully.` });
            });
        });
    });
});

// ==========================================
// EXISTING PROFILE & CUSTOMER API ROUTES
// ==========================================

app.get('/api/profile', (req, res) => {
    const { userID } = req.query;
    if (!userID) return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });

    const profileQuery = `
        SELECT FirstName, MiddleName, LastName, MobileNumber, Username, PlateNumber, CreatedAt, UpdatedAt
        FROM WebCustomers WHERE UserID = ? LIMIT 1
    `;
    db.query(profileQuery, [userID], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database system processing failure' });
        if (results.length === 0) return res.status(404).json({ error: 'User profile context not found.' });
        res.json(results[0]);
    });
});

app.put('/api/profile', (req, res) => {
    const { userID, username, currentPassword, newPassword } = req.body;
    if (!userID) return res.status(401).json({ message: 'User authorization credentials invalid or expired.' });
    if (username !== undefined && username.trim() === '') {
        return res.status(400).json({ field: 'username', message: 'Username field cannot be left blank.' });
    }

    const fetchUserSql = 'SELECT Password, Username FROM WebCustomers WHERE UserID = ? LIMIT 1';
    db.query(fetchUserSql, [userID], (err, users) => {
        if (err) return res.status(500).json({ message: 'Database transactional runtime error prevented execution.' });
        if (users.length === 0) return res.status(404).json({ message: 'User account mapping missing.' });

        const currentUserRecord = users[0];

        // 1. If username changes, check for collisions across both tables
        if (username && username.trim() !== currentUserRecord.Username) {
            const cleanedUsername = username.trim();
            const checkCollisionSql = 'SELECT UserID FROM WebCustomers WHERE Username = ? AND UserID != ? LIMIT 1';
            
            db.query(checkCollisionSql, [cleanedUsername, userID], (collisionErr, collisions) => {
                if (collisionErr) return res.status(500).json({ message: 'Database validation fault.' });
                if (collisions.length > 0) return res.status(400).json({ field: 'username', message: 'This username is already taken.' });

                // ✔️ CROSS-TABLE SAFETY CHECK: Verify username does not exist inside WebAdminUsers
                const checkAdminCollisionSql = 'SELECT AdminID FROM WebAdminUsers WHERE Username = ? LIMIT 1';
                db.query(checkAdminCollisionSql, [cleanedUsername], async (adminErr, adminCollisions) => {
                    if (adminErr) return res.status(500).json({ message: 'Database administrative identity validation fault.' });
                    if (adminCollisions && adminCollisions.length > 0) {
                        return res.status(400).json({ field: 'username', message: 'This username is already taken.' });
                    }

                    // No duplicates found in either customer or admin registers
                    await processPasswordAndExecute(cleanedUsername, currentUserRecord);
                });
            });
        } else {
            // No username change, proceed straight to password checks
            processPasswordAndExecute(currentUserRecord.Username, currentUserRecord);
        }
    });

    // Helper function to handle async bcrypt operations cleanly
    async function processPasswordAndExecute(targetUsername, currentUserRecord) {
        let updates = [];
        let queryParams = [];

        if (targetUsername !== currentUserRecord.Username) {
            updates.push('Username = ?');
            queryParams.push(targetUsername);
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ field: 'password', message: 'Verification password must be supplied.' });
            }

            // Verify current password against database bcrypt hash
            let passwordMatch = false;
            try {
                if (currentUserRecord.Password && (currentUserRecord.Password.startsWith('$2b$') || currentUserRecord.Password.startsWith('$2a$'))) {
                    passwordMatch = await bcrypt.compare(currentPassword, currentUserRecord.Password);
                } else {
                    passwordMatch = (currentPassword === currentUserRecord.Password);
                }
            } catch (bcryptErr) {
                return res.status(500).json({ message: 'Security validation check failed.' });
            }

            if (!passwordMatch) {
                return res.status(400).json({ field: 'password', message: 'The current password entered is incorrect.' });
            }

            // Hash the new password before storing it
            try {
                const saltRounds = 10;
                const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
                updates.push('Password = ?');
                queryParams.push(hashedNewPassword);
            } catch (hashErr) {
                return res.status(500).json({ message: 'Failed to process security metrics.' });
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No configuration parameters were altered.' });
        }

        queryParams.push(userID);
        const updateSql = `UPDATE WebCustomers SET ${updates.join(', ')} WHERE UserID = ?`;

        db.query(updateSql, queryParams, (updateErr, result) => {
            if (updateErr) {
                console.error("SQL Write Exception:", updateErr);
                return res.status(500).json({ message: 'Internal system database write action fault.' });
            }
            res.json({ success: true, message: 'Account configuration metrics successfully updated.' });
        });
    }
});

app.get('/api/bookings/busy-slots', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Target query parameters invalid or missing' });

    const sqlQuery = `SELECT BookingTime FROM WebBookings WHERE BookingDate = ? AND Status = 'Confirmed'`;
    db.query(sqlQuery, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database system processing failure' });
        const bookedTimes = rows.map(row => row.BookingTime);
        res.json({ bookedTimes });
    });
});

app.post('/api/bookings/create', (req, res) => {
    const { bookingDate, bookingTime, userID } = req.body;
    if (!userID) return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });
    if (!bookingDate || !bookingTime) return res.status(400).json({ error: 'Missing appointment details.' });

    const activeBookingCheckSql = `SELECT BookingID FROM WebBookings WHERE UserID = ? AND Status = 'Confirmed'`;
    db.query(activeBookingCheckSql, [userID], (activeErr, activeRecords) => {
        if (activeErr) return res.status(500).json({ error: 'Database verification fault.' });
        if (activeRecords.length > 0) {
            return res.status(400).json({ error: 'The same car can only book 1 appointment at a time. Please complete your existing booking first.' });
        }

        const checkSql = `SELECT BookingID FROM WebBookings WHERE BookingDate = ? AND BookingTime = ? AND Status = 'Confirmed'`;
        db.query(checkSql, [bookingDate, bookingTime], (err, existingRecords) => {
            if (err) return res.status(500).json({ error: 'Database conflict validation fault.' });
            if (existingRecords.length > 0) return res.status(409).json({ error: 'This time block was booked a second ago! Choose another slot.' });

            const insertSql = `INSERT INTO WebBookings (UserID, BookingDate, BookingTime, Status) VALUES (?, ?, ?, 'Confirmed')`;
            db.query(insertSql, [userID, bookingDate, bookingTime], (insertErr, result) => {
                if (insertErr) return res.status(500).json({ error: 'Internal system database write action fault.' });
                res.json({ success: true, message: 'Reservation transaction stored.' });
            });
        });
    });
});

app.get('/api/bookings/my-booking', (req, res) => {
    const { userID } = req.query;
    if (!userID) return res.status(401).json({ error: 'User authorization credentials invalid or expired.' });

    const sqlQuery = `
        SELECT b.BookingID, b.BookingDate, b.BookingTime, b.Status, b.CreatedAt AS BookingCreatedAt,
               c.FirstName, c.MiddleName, c.LastName, c.PlateNumber, c.MobileNumber
        FROM WebBookings b INNER JOIN WebCustomers c ON b.UserID = c.UserID
        WHERE b.UserID = ? ORDER BY b.BookingDate DESC, b.BookingTime DESC LIMIT 1
    `;
    db.query(sqlQuery, [userID], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database system processing failure' });
        if (rows.length === 0) return res.status(200).json({ noBooking: true, message: 'No current reservations found.' });
        res.json(rows[0]);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:\${PORT}`);
});