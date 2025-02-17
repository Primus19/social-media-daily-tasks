import React, { useEffect, useState } from 'react';
import { Calendar, Facebook, Instagram, Linkedin, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import type { SocialTasks } from './types';

function App() {
  const [tasks, setTasks] = useState<SocialTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In production, this would be your actual API endpoint
      const mockTasks: SocialTasks = {
        platforms: {
          facebook: "Share an inspiring customer success story with relevant hashtags",
          instagram: "Post a behind-the-scenes photo of your team at work",
          linkedin: "Write an article about industry trends and tag relevant thought leaders"
        },
        generatedDate: new Date().toISOString()
      };
      
      setTasks(mockTasks);
    } catch (err) {
      setError('Failed to fetch tasks. Please try again later.');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">{error}</p>
          <button 
            onClick={fetchTasks}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 bg-blue-500 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Daily Social Media Tasks
            </h1>
            <p className="mt-2 text-blue-100">
              Generated on: {tasks ? format(new Date(tasks.generatedDate), 'MMMM d, yyyy') : ''}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {tasks && (
              <>
                <TaskCard
                  platform="Facebook"
                  task={tasks.platforms.facebook}
                  icon={<Facebook className="w-6 h-6" />}
                  color="bg-blue-100"
                  textColor="text-blue-600"
                />
                
                <TaskCard
                  platform="Instagram"
                  task={tasks.platforms.instagram}
                  icon={<Instagram className="w-6 h-6" />}
                  color="bg-pink-100"
                  textColor="text-pink-600"
                />
                
                <TaskCard
                  platform="LinkedIn"
                  task={tasks.platforms.linkedin}
                  icon={<Linkedin className="w-6 h-6" />}
                  color="bg-blue-100"
                  textColor="text-blue-800"
                />
              </>
            )}
          </div>
        </div>
        
        <button
          onClick={fetchTasks}
          className="mt-6 mx-auto block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh Tasks
        </button>
      </div>
    </div>
  );
}

interface TaskCardProps {
  platform: string;
  task: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

function TaskCard({ platform, task, icon, color, textColor }: TaskCardProps) {
  return (
    <div className={`p-4 rounded-lg ${color}`}>
      <div className="flex items-start gap-4">
        <div className={`${textColor}`}>
          {icon}
        </div>
        <div>
          <h2 className={`font-semibold ${textColor}`}>{platform}</h2>
          <p className="mt-1 text-gray-700">{task}</p>
        </div>
      </div>
    </div>
  );
}

export default App;