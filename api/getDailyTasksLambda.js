import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "social-media-automation-daily-tasks";
const chatGPTTaskEndpoint = "https://api.openai.com/v1/chat/completions";

const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
};

// Generate a short and concise prompt to ensure short, engaging daily content
function generatePrompt() {
    const topics = [
        "DevOps best practices for CI/CD pipelines",
        "Cloud computing trends and strategies",
        "Machine Learning applications in IT automation",
        "AI-powered DevOps solutions",
        "How to optimize Kubernetes workloads",
        "Modern infrastructure as code (IaC) frameworks",
        "Serverless computing in cloud environments",
        "Automation in cybersecurity and cloud security",
        "Best tools for managing microservices",
        "How AI is revolutionizing IT infrastructure management"
    ];

    // Rotate through topics daily
    const todayTopic = topics[new Date().getDate() % topics.length];

    return `Create a short, engaging post (5–10 lines) about '${todayTopic}'. 
    Keep it concise, with a clear takeaway or tip for engineers working in DevOps, Cloud Computing, AI, or Kubernetes. 
    The post should be suitable for social media, direct, and engaging.`;
}

// Exponential backoff retry function
async function fetchChatGPTPosts(maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Calling OpenAI API using gpt-4o (Attempt ${attempt})...`);

            const response = await fetch(chatGPTTaskEndpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { "role": "system", "content": "You are an AI assistant that generates concise, engaging daily social media posts for engineers." },
                        { "role": "user", "content": generatePrompt() }
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
            console.error(`Error fetching posts from OpenAI (Attempt ${attempt}):`, error);
            if (attempt === maxRetries) return null;
        }
    }
}

async function uploadToS3(platform, content) {
    const todayDate = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileKey = `${platform}/${todayDate}-${timestamp}.json`;

    try {
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: JSON.stringify({ post: content }),
            ContentType: "application/json"
        }));
        console.log(`Uploaded ${platform} post to S3: ${fileKey}`);
    } catch (err) {
        console.error(`Error uploading to S3 for ${platform}:`, err);
    }
}

export const handler = async (event) => {
    console.log("Fetching posts from ChatGPT...");
    const tasks = await fetchChatGPTPosts();

    if (!tasks) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch posts from ChatGPT" }),
        };
    }

    const platforms = ["Facebook", "Instagram", "LinkedIn"];
    const splitPosts = tasks.split("\n").filter((post) => post.trim() !== "");

    for (let i = 0; i < platforms.length; i++) {
        const postContent = splitPosts[i] || "No post available.";
        await uploadToS3(platforms[i], postContent);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Daily posts uploaded to S3 successfully!" }),
    };
};
