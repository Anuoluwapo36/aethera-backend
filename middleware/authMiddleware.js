const API_KEY = process.env.AETHERA_API_KEY;

const protectApi = (req, res, next) => {
    const key = req.headers["x-api-key"];
    if (!API_KEY || !key || key !== API_KEY) {
        return res.status(401).json({success: false, message: "Access Denied"});
    }
    next();
};

module.exports = {protectApi};
