const AWS = require("aws-sdk");
const axios = require("axios");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1",  
});

const bucketName = "social-media-automation-daily-tasks";
const chatGPTTaskEndpoint = "https://api.openai.com/v1/engines/text-davinci-003/completions"; // Example ChatGPT API (replace with actual endpoint)

const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
};

async function fetchChatGPTTasks() {
    try {
        const response = await axios.post(chatGPTTaskEndpoint, {
            prompt: "Generate unique Cloud Engineering, DevOps, and AI daily tasks for Facebook, Instagram, and LinkedIn.",
            max_tokens: 200
        }, { headers });

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error("Error fetching tasks from ChatGPT:", error);
        return null;
    }
}

async function uploadToS3(platform, content) {
    const todayDate = new Date().toISOString().split("T")[0];
    const fileKey = `${platform}/${todayDate}.json`;

    try {
        await s3.putObject({
            Bucket: bucketName,
            Key: fileKey,
            Body: JSON.stringify({ task: content }),
            ContentType: "application/json"
        }).promise();
        console.log(`Uploaded ${platform} task to S3: ${fileKey}`);
    } catch (err) {
        console.error(`Error uploading to S3 for ${platform}:`, err);
    }
}

exports.handler = async (event) => {
    console.log("Fetching tasks from ChatGPT...");
    const tasks = await fetchChatGPTTasks();

    if (!tasks) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch tasks from ChatGPT" }),
        };
    }

    const platforms = ["Facebook", "Instagram", "LinkedIn"];
    const splitTasks = tasks.split("\n");

    // Ensure tasks are stored properly per platform
    for (let i = 0; i < platforms.length; i++) {
        await uploadToS3(platforms[i], splitTasks[i] || "No task available.");
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Daily tasks uploaded to S3 successfully!" }),
    };
};
