import React, { useEffect, useState } from 'react';
import { Calendar, Facebook, Instagram, Linkedin, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "social-media-automation-daily-tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // List all JSON posts from the S3 bucket
      const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
      const { Contents } = await s3.send(listCommand);

      if (!Contents || Contents.length === 0) {
        setTasks([]);
        return;
      }

      // Fetch all posts from S3
      const posts = await Promise.all(
        Contents.map(async (file) => {
          if (file.Key.endsWith(".json")) {
            const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: file.Key });
            const { Body } = await s3.send(getCommand);

            const streamToString = (stream) =>
              new Promise((resolve, reject) => {
                let data = "";
                stream.on("data", (chunk) => (data += chunk));
                stream.on("end", () => resolve(data));
                stream.on("error", reject);
              });

            const jsonData = await streamToString(Body);
            const parsedData = JSON.parse(jsonData);

            return { ...parsedData, date: file.LastModified, platform: file.Key.split("/")[0] };
          }
          return null;
        })
      );

      // Filter out null values
      const validPosts = posts.filter(Boolean);

      setTasks(validPosts);
    } catch (err) {
      setError("Failed to fetch posts. Please try again later.");
      console.error("Error fetching posts from S3:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedPlatform && task.platform !== selectedPlatform) return false;
    if (selectedDate && format(new Date(task.date), 'yyyy-MM-dd') !== selectedDate) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">📢 Social Media Post Tracker</h1>
          <button onClick={fetchTasks} className="bg-blue-500 text-white px-4 py-2 rounded flex items-center">
            <RefreshCw className="w-5 h-5 mr-2" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="border p-2 rounded w-1/3"
            defaultValue=""
          >
            <option value="">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
          </select>

          <input
            type="date"
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border p-2 rounded w-1/3"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-blue-500">Loading posts...</div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center text-red-500">{error}</div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50 shadow-md">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-700">{task.platform.toUpperCase()}</h2>
                <span className="text-sm text-gray-500">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  {format(new Date(task.date), 'PPP')}
                </span>
              </div>
              <p className="mt-2 text-gray-800">{task.message}</p>
            </div>
          ))}
        </div>

        {/* No Posts Message */}
        {!loading && filteredTasks.length === 0 && (
          <div className="text-center text-gray-500 mt-4">No posts found for the selected filters.</div>
        )}
      </div>
    </div>
  );
}

export default App;