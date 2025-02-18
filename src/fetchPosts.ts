import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Amplify, Auth } from "aws-amplify";
import awsConfig from "../aws-exports"; // Ensure aws-exports.js is properly configured

// Configure Amplify
Amplify.configure(awsConfig);

async function getS3Client() {
  try {
    // Retrieve AWS credentials from Amplify IAM Role
    const credentials = await Auth.currentCredentials();
    if (!credentials) {
      throw new Error("❌ Failed to retrieve Amplify IAM credentials.");
    }

    return new S3Client({
      region: "us-east-1",
      credentials,
    });
  } catch (error) {
    console.error("❌ Error retrieving credentials from Amplify:", error);

    // Fallback to environment variables if Amplify credentials fail
    if (process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
      console.warn("⚠️ Using environment variables as a fallback for credentials.");
      return new S3Client({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        },
      });
    } else {
      throw new Error("❌ No valid AWS credentials found.");
    }
  }
}

async function fetchPosts(platform: string) {
  try {
    const s3 = await getS3Client();
    const bucketName = "social-media-automation-daily-tasks";

    // Use platform as prefix (folder name)
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${platform}/`, // Ensure the folder is specified
    });

    const response = await s3.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.error(`❌ No files found in ${platform} folder`);
      return;
    }

    for (const file of response.Contents) {
      console.log(`📜 Fetching file: ${file.Key}`);

      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: file.Key, // Full path
      });

      const object = await s3.send(getCommand);
      const body = await object.Body?.transformToString(); // Read JSON file content
      console.log(`✅ File content for ${file.Key}:`, JSON.parse(body || "{}"));
    }
  } catch (error) {
    console.error(`❌ Error fetching posts for ${platform}:`, error);
  }
}

// Fetch posts for Facebook, Instagram, and LinkedIn
fetchPosts("Facebook");
fetchPosts("Instagram");
fetchPosts("LinkedIn");
