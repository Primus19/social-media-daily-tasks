import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Amplify, Auth } from "aws-amplify";
import awsConfig from "../aws-exports"; // Ensure aws-exports.js is properly configured

// Configure Amplify
Amplify.configure(awsConfig);

async function getS3Client() {
  console.log("🔍 Initializing S3 Client...");

  try {
    console.log("🔍 Attempting to retrieve credentials from Amplify...");
    const credentials = await Auth.currentCredentials();

    if (!credentials || !credentials.accessKeyId) {
      throw new Error("❌ Failed to retrieve valid Amplify IAM credentials.");
    }

    console.log("✅ Successfully retrieved Amplify IAM credentials:");
    console.log(`🔑 Access Key ID: ${credentials.accessKeyId}`);

    return new S3Client({
      region: "us-east-1",
      credentials,
    });
  } catch (error) {
    console.error("❌ Error retrieving credentials from Amplify:", error.message);

    if (process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
      console.warn("⚠️ Using environment variables as a fallback for credentials.");
      console.log(`🔑 REACT_APP_AWS_ACCESS_KEY_ID: ${process.env.REACT_APP_AWS_ACCESS_KEY_ID}`);

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
  console.log(`📜 Fetching posts for platform: ${platform}`);

  try {
    const s3 = await getS3Client();
    const bucketName = "social-media-automation-daily-tasks";

    console.log(`🔍 Listing objects in bucket: ${bucketName}, folder: ${platform}/`);

    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${platform}/`, // Ensure the folder is specified
    });

    const response = await s3.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.error(`❌ No files found in ${platform} folder`);
      return;
    }

    console.log(`✅ Found ${response.Contents.length} file(s) in ${platform} folder:`);

    for (const file of response.Contents) {
      console.log(`📜 Attempting to fetch file: ${file.Key}`);

      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: file.Key, // Full path
      });

      try {
        const object = await s3.send(getCommand);
        const body = await object.Body?.transformToString(); // Read JSON file content

        console.log(`✅ Successfully fetched file: ${file.Key}`);
        console.log(`📜 File content preview:\n${body?.substring(0, 500)}...`); // Display first 500 chars
      } catch (fileError) {
        console.error(`❌ Error fetching file: ${file.Key}`, fileError.message);
      }
    }
  } catch (error) {
    console.error(`❌ Critical error fetching posts for ${platform}:`, error.message);
  }
}

// Fetch posts for Facebook, Instagram, and LinkedIn
fetchPosts("Facebook");
fetchPosts("Instagram");
fetchPosts("LinkedIn");
