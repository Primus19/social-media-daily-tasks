import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" }); 
const bucketName = "social-media-automation-daily-tasks";
const chatGPTTaskEndpoint = "https://api.openai.com/v1/chat/completions";

const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
};

// Exponential backoff retry function
async function fetchChatGPTTasks(maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Calling OpenAI API using gpt-4o (Attempt ${attempt})...`);

            const response = await fetch(chatGPTTaskEndpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { "role": "system", "content": "You are an AI assistant that provides daily Cloud Engineering, DevOps, and AI tasks." },
                        { "role": "user", "content": "Generate unique Cloud Engineering, DevOps, and AI daily tasks for Facebook, Instagram, and LinkedIn." }
                    ],
                    max_tokens: 300
                })
            });

            console.log(`Received OpenAI API Response: ${response.status} ${response.statusText}`);

            if (response.status === 429) {
                console.warn(`Rate limited! Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Increase delay for exponential backoff
                continue;
            }

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();

        } catch (error) {
            console.error(`Error fetching tasks from OpenAI (Attempt ${attempt}):`, error);
            if (attempt === maxRetries) return null;
        }
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
