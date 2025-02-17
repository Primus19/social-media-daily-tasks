import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

// AWS S3 Configuration (Hardcoded Region)
const s3 = new S3Client({ region: "us-east-1" }); // Hardcoded AWS region

const bucketName = "social-media-automation-daily-tasks"; // Hardcoded S3 bucket name
const chatGPTTaskEndpoint = "https://api.openai.com/v1/completions"; // Updated OpenAI API endpoint

const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, // OpenAI API key must be set in Lambda environment variables
    "Content-Type": "application/json"
};

async function fetchChatGPTTasks() {
    try {
        const response = await axios.post(chatGPTTaskEndpoint, {
            model: "gpt-4",
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
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: JSON.stringify({ task: content }),
            ContentType: "application/json"
        }));
        console.log(`Uploaded ${platform} task to S3: ${fileKey}`);
    } catch (err) {
        console.error(`Error uploading to S3 for ${platform}:`, err);
    }
}

export const handler = async (event) => {
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

    for (let i = 0; i < platforms.length; i++) {
        await uploadToS3(platforms[i], splitTasks[i] || "No task available.");
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Daily tasks uploaded to S3 successfully!" }),
    };
};
