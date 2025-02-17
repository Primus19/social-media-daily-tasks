const AWS = require("aws-sdk");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1",
});

const bucketName = "social-media-automation-daily-tasks";

exports.handler = async (event) => {
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

        return {
            statusCode: 200,
            body: JSON.stringify(tasks),
            headers: { "Content-Type": "application/json" },
        };
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to retrieve daily tasks." }),
        };
    }
};
