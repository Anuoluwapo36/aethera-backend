const database = require("../config/db");



/**

 * fetching user details by id

 */

const userDetails = (req, res) => {

    const userId = req.params.userId;



    const getUserDetails = `SELECT userId, username, fullname, bio, profession, profile_image AS image_uri FROM users WHERE userId = ?`;

    database.query(getUserDetails, [userId], (err, result) => {

        if (err) return res.json({success: false, message: "something went wrong"});



        if (result.length === 0) {

            return res.json({success: false, message: " user does not exist"});

        }

        res.json({success: true, data: result[0]});

    });

};



const updateUserDetails = (req, res) => {

    const userId = req.params.userId;

    const {username, fullname, bio, profession} = req.body;



    const updateUserDetails = `UPDATE users SET username = COALESCE(?, username), fullname = COALESCE(?, fullname), bio = COALESCE(?, bio), profession = COALESCE(?, profession) WHERE userId = ?`;



    database.query(updateUserDetails, [username, fullname, bio, profession, userId], (err, result) => {

        if (err) return res.json({success: false, message: "something went wrong"});



        if (result.affectedRows === 0) {

            return res.json({success: false, message: " user does not exist"});

        }

        res.json({success: true, message: "user details updated successfully"});

    });

};



const uploadProfilePicture = (req, res) => {

    const userId = req.params.userId;



    if (!req.file) {

        return res.json({success: false, message: "No image uploaded"});

    }

    const imagePath = "uploads/profileImage/" + req.file.filename;



    const imageUri = "http://localhost:8000/" + imagePath;



    const updateProfilePicture = `UPDATE users SET profile_image = ? WHERE userId = ?`;

    database.query(updateProfilePicture, [imagePath, userId], (err, result) => {

        if (err) return res.json({success: false, message: "failed to upload profile picture"});



        if (result.affectedRows === 0) {

            return res.json({success: false, message: " user does not exist"});

        }

        res.json({success: true, message: "profile picture uploaded successfully", data: {imageUri}});

    });

};



module.exports = {userDetails, updateUserDetails, uploadProfilePicture};

