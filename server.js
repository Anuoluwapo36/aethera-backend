const express = require("express");
const cors = require("cors");
const app = express();

// Middleware
app.use(
    cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "x-api-key", "Authorization"],
    })
);
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Static folder for images
app.use("/uploads", express.static("uploads"));

// Routes
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const userDetails = require("./routes/userRoutes");
const homeFeedRoutes = require("./routes/homeFeedRoutes");
const commentsRoutes = require("./routes/commentsRoutes");
const searchRoutes = require("./routes/searchRoutes");
const followRoutes = require("./routes/followRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const statusRoutes = require("./routes/statusRoutes");
const postController = require("./controllers/postController");
const {protectApi} = require("./middleware/authMiddleware");
const ensureNotificationsTable = require("./utils/ensureNotificationsTable");

// Base API
const BASE_PATH = "/api";
app.use(BASE_PATH, protectApi);
app.use(BASE_PATH, authRoutes);
app.use(BASE_PATH, postRoutes);
app.use(BASE_PATH, userDetails);
app.use(BASE_PATH, homeFeedRoutes);
app.use(BASE_PATH, commentsRoutes);
app.use(BASE_PATH, searchRoutes);
app.use(BASE_PATH, followRoutes);
app.use(BASE_PATH, notificationRoutes);
app.use(BASE_PATH, statusRoutes);
app.post(`${BASE_PATH}/deletePost`, postController.deletePost);

app.get(`${BASE_PATH}/health`, (req, res) => {
    res.json({
        ok: true,
        server: "aethera-my-bakend",
        deletePostReady: typeof postController.deletePost === "function",
        statusReady: true,
    });
});

// Start server
const PORT = 8000;
app.listen(PORT, "0.0.0.0", () => {
    ensureNotificationsTable();
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Notifications API: schema v2 (no statusId column required)");
    console.log(`Emulator access: http://10.0.2.2:${PORT}`);
    console.log(`POST ${BASE_PATH}/deletePost is ready`);
    console.log(`Status routes ready under ${BASE_PATH}/statusFeed`);
    if (typeof postController.deletePost !== "function") {
        console.error("ERROR: deletePost handler is missing!");
    }
});
