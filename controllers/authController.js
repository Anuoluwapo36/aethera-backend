const bcrypt = require("bcryptjs");
const database = require("../config/db");
const mailTransporter = require("../config/email");

// Generate 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Login
const login = (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.json({success: false, message: "All fields are required"});
    }

    database.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.json({success: false, message: "Something went wrong"});
        if (results.length === 0) return res.json({success: false, message: "Email not registered"});

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) return res.json({success: false, message: "Incorrect password"});

        res.json({
            success: true,
            userId: user.userId,
            message: "Login successful",
        });
    });
};

// Register
const register = async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const termsAccepted = req.body.termsAccepted;

    // Validate input
    if (!username || !email || !password) {
        return res.json({
            success: false,
            message: "All fields are required",
        });
    }
    //validate username length
    if (username.length <= 4) {
        return res.json({
            success: false,
            message: "Username must be at least 5 characters long",
        });
    }
    //validate password length
    if (password.length <= 6) {
        return res.json({
            success: false,
            message: "password is too weak",
        });
    }
    if (
        password.length > 6 &&
        !password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    ) {
        return res.json({
            success: false,
            message:
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
    }

    if (
        !email.includes("@") ||
        !email.includes(".") ||
        !email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ) {
        return res.json({
            success: false,
            message: "Invalid email format",
        });
    }
    if (!termsAccepted) {
        return res.json({
            success: false,
            message: "You must accept the terms and conditions",
        });
    }

    // Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const query = "INSERT INTO users (username,email,is_term_check, password) VALUES (?,?,?,?)";

    database.query(query, [username, email, termsAccepted, hashedPassword], (err, result) => {
        // Handle database errors

        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.json({
                    success: false,
                    message: "Email already exists",
                });
            } else {
                res.json({
                    success: false,
                    message: "failed to create account, try again later",
                });
            }
        }

        // Return success response
        res.json({
            success: true,
            user: {
                id: result.insertId,
                username: username,
                email: email,
            },
            message: "Registration successful",
        });
    });
};

// Check Email
// const checkEmail = (req, res) => {
//     const {email} = req.body;

//     if (!req.body || !req.body.email) {
//         return res.json({success: false, message: "Email is required"});
//     }
//     const code = generateCode();
//     const expiry = Date.now() + 15 * 60 * 1000;

//     database.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
//         if (results.length === 0) return res.json({success: false, message: "Email not found"});

//         database.query(
//             "UPDATE users SET reset_code = ?, reset_code_expiry = ? WHERE email = ?",
//             [code, expiry, email],
//             () => {
//                 mailTransporter.sendMail(
//                     {
//                         from: "Aethera Support <mercy_365@qq.com>",
//                         to: email,
//                         subject: "Password Reset Code",
//                         text: `Your code: ${code}`,
//                     },
//                     () => res.json({success: true, message: "Code sent"})
//                 );
//             }
//         );
//     });
// };

const checkEmail = (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.json({
            success: false,
            message: "Email is required",
        });
    }
    if (
        !email.includes("@") ||
        !email.includes(".") ||
        !email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ) {
        return res.json({
            success: false,
            message: "Invalid email format",
        });
    }

    database.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) {
            return res.json({
                success: false,
                message: "something went wrong, try again later",
            });
        }

        if (results.length > 0) {
            const code = generateCode();

            const expiry = Date.now() + 15 * 60 * 1000; // Code expires in 15 minutes

            const updateQuery = "UPDATE users SET reset_code = ?, reset_code_expiry = ? WHERE email = ?";
            database.query(updateQuery, [code, expiry, email], (err) => {
                if (err) {
                    return res.json({
                        success: false,
                        message: "something went wrong, try again later",
                    });
                }

                // Send reset code to user's email
                mailTransporter.sendMail(
                    {
                        from: "Aethera Support <mercy_365@qq.com>",
                        to: email,
                        subject: "password reset code",
                        text: `your password reset code is: ${code}. This code will expire in 15 minutes.
                        If you did not request a password reset, please ignore this email. 
                        contact support if you have any questions or concerns.

                        `,
                    },
                    (error) => {
                        // Handle email sending errors
                        if (error) {
                            console.error("Failed to send email: ", error);
                            return res.json({
                                success: false,
                                message: "Failed to send email",
                            });
                        }
                        return res.json({
                            success: true,
                            message: "Code send to email",
                        });
                    }
                );
            });
        } else {
            return res.json({
                success: false,
                message: "Email does not exist",
            });
        }
    });
};

// Verify Code
// const verifyCode = (req, res) => {
//     const {code} = req.body;
//     database.query("SELECT * FROM users WHERE reset_code = ?", [code], (err, results) => {
//         if (results.length === 0) return res.json({success: false, message: "Invalid code"});
//         res.json({success: true, message: "Code verified"});
//     });
// };

const verifyCode = (req, res) => {
    const code = req.body.code;

    if (!code) {
        return res.json({
            success: false,
            message: "Code is required",
        });
    }

    database.query("SELECT * FROM users WHERE reset_code = ?", [code], (err, results) => {
        if (err) {
            return res.json({
                success: false,
                message: "something went wrong, try again later",
            });
        }

        if (results.length === 0) {
            return res.json({
                success: false,
                message: "Invalid code",
            });
        }
        const user = results[0];
        // Check if code has expired
        if (Date.now() > user.reset_code_expiry) {
            return res.json({
                success: false,
                message: "Code has expired",
            });
        }

        res.json({
            success: true,
            message: "Code is verified",
            userId: user.userId,
        });
    });
};

// Reset Password
// const resetPassword = (req, res) => {
//     const {userId, newPassword} = req.body;
//     const hashed = bcrypt.hashSync(newPassword, 10);

//     database.query(
//         "UPDATE users SET password = ?, reset_code = NULL, reset_code_expiry = NULL WHERE userId = ?",
//         [hashed, userId],
//         () => res.json({success: true, message: "Password reset successful"})
//     );
// };

const resetPassword = (req, res) => {
    const {userId, newPassword, confirmPassword} = req.body;

    if (!userId) {
        return res.json({
            success: false,
            message: "User ID is required",
        });
    }
    if (!newPassword) {
        return res.json({
            success: false,
            message: "New password is required",
        });
    }
    if (newPassword.length <= 6) {
        return res.json({
            success: false,
            message: "password is too weak",
        });
    }
    if (!confirmPassword) {
        return res.json({
            success: false,
            message: "Confirm password is required",
        });
    }
    if (newPassword !== confirmPassword) {
        return res.json({
            success: false,
            message: "Passwords do not match",
        });
    }

    // Hash new password using bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Check if user exists and reset code is valid before updating password
    // This query checks if there is a user with the provided userId and that the reset code has not expired
    // (i.e., the current time is less than the reset_code_expiry).
    // If such a user exists, it proceeds to update the password; otherwise, it returns an error response indicating that the reset code is invalid or has expired.
    database.query(
        "SELECT * FROM users WHERE userId = ? AND reset_code_expiry > ?",
        [req.body.userId, Date.now()],
        (err, result) => {
            if (err) {
                return res.json({
                    success: false,
                    message: "something went wrong, try again later",
                });
            }
            if (result.length === 0) {
                return res.json({
                    success: false,
                    message: "Invalid or expired reset code",
                });
            }
            const userEmail = result[0].email;
            // Update user's password and clear reset code
            database.query(
                "UPDATE users SET password = ? , reset_code = NULL, reset_code_expiry = NULL WHERE userId = ?",
                [hashedPassword, req.body.userId],
                (err, result) => {
                    if (err) {
                        return res.json({
                            success: false,
                            message: "something went wrong, try again later",
                        });
                    }

                    // Send reset code to user's email
                    mailTransporter.sendMail(
                        {
                            from: "Aethera Support <mercy_365@qq.com>",
                            to: userEmail,
                            subject: "password reset successful",
                            text: `your password has been reset successfully.
                            If you did not request this change, please contact support immediately.

                        `,
                        },
                        (error) => {
                            // Handle email sending errors
                            if (error) {
                                console.error("Failed to reset password: ", error);
                                return res.json({
                                    success: false,
                                    message: "Failed to reset password",
                                });
                            }
                            return res.json({
                                success: true,
                                message: "Password reset successful",
                            });
                        }
                    );
                }
            );
        }
    );
};
module.exports = {login, register, checkEmail, verifyCode, resetPassword};
