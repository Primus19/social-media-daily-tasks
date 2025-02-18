import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Amplify, Auth } from "aws-amplify";
import awsConfig from "../aws-exports"; // Ensure aws-exports.js is properly configured
import { useState, useEffect } from "react";

// Configure Amplify
Amplify.configure(awsConfig);

export default function FetchPostsComponent() {
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prevLogs) => [...prevLogs, message]); // Updates logs displayed in UI
    console.log(message); // Also logs in console for debugging
  }

  async function getS3Client() {
    addLog("🔍 Initializing S3 Client...");

    try {
      addLog("🔍 Attempting to retrieve credentials from Amplify...");
      const credentials = await Auth.currentCredentials();

      if (!credentials || !credentials.accessKeyId) {
        throw new Error("❌ Failed to retrieve valid Amplify IAM credentials.");
      }

      addLog("✅ Successfully retrieved Amplify IAM credentials:");
      addLog(`🔑 Access Key ID: ${credentials.accessKeyId}`);
      addLog(`🔑 Session Token: ${credentials.sessionToken ? "Exists ✅" : "Missing ❌"}`);

      return new S3Client({
        region: "us-east-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken, // Required for assumed roles
        },
      });
    } catch (error) {
      addLog(`❌ Error retrieving credentials from Amplify: ${error.message}`);

      if (process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
        addLog("⚠️ Using environment variables as a fallback for credentials.");
        addLog(`🔑 REACT_APP_AWS_ACCESS_KEY_ID: ${process.env.REACT_APP_AWS_ACCESS_KEY_ID}`);

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
    addLog(`📜 Fetching posts from S3 for platform: ${platform}...`);

    try {
      const s3 = await getS3Client();
      const bucketName = "social-media-automation-daily-tasks";

      addLog(`🔍 Listing objects in bucket: ${bucketName}, folder: ${platform}/`);

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${platform}/`, // Ensure the folder is specified
      });

      const response = await s3.send(listCommand);

      if (!response.Contents || response.Contents.length === 0) {
        addLog(`❌ No files found in ${platform} folder`);
        return;
      }

      addLog(`✅ Found ${response.Contents.length} file(s) in ${platform} folder:`);

      for (const file of response.Contents) {
        addLog(`📜 Attempting to fetch file: ${file.Key}`);

        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: file.Key, // Full path
        });

        try {
          const object = await s3.send(getCommand);
          const body = await object.Body?.transformToString(); // Read JSON file content

          addLog(`✅ Successfully fetched file: ${file.Key}`);
          addLog(`📜 File content preview:\n${body?.substring(0, 500)}...`); // Display first 500 chars
        } catch (fileError) {
          addLog(`❌ Error fetching file: ${file.Key} - ${fileError.message}`);
        }
      }
    } catch (error) {
      addLog(`❌ Error fetching posts for ${platform}: ${error.message}`);
    }
  }

  useEffect(() => {
    fetchPosts("Facebook");
    fetchPosts("Instagram");
    fetchPosts("LinkedIn");
  }, []);

  return (
    <div>
      <h2>📜 Fetch Logs</h2>
      <div style={{ backgroundColor: "#f4f4f4", padding: "10px", borderRadius: "5px" }}>
        {logs.map((log, index) => (
          <p key={index} style={{ fontFamily: "monospace" }}>{log}</p>
        ))}
      </div>
    </div>
  );
}
