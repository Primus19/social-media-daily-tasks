const express = require("express");
const AWS = require("aws-sdk");
const cors = require("cors");

const app = express();
app.use(cors());

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1", // Change this to your AWS region
});

const bucketName = "social-media-automation-daily-tasks";

app.get("/get-daily-tasks", async (req, res) => {
    try {
        const date = new Date().toISOString().split("T")[0];
        const platforms = ["Facebook", "Instagram", "LinkedIn"];
        let tasks = { platforms: {} };

        for (const platform of platforms) {
            const key = `${platform}/${date}.json`;
            const params = { Bucket: bucketName, Key: key };

            const data = await s3.getObject(params).promise();
            tasks.platforms[platform.toLowerCase()] = JSON.parse(data.Body.toString());
        }

        return res.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({ error: "Failed to retrieve daily tasks." });
    }
});

if (require.main === module) {
    app.listen(3000, () => console.log("Server running on port 3000"));
}

module.exports = app;
