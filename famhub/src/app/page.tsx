import { Home, Mail, Settings, User } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Family Connect</h1>
      
      {/* Example of using Lucide icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <Home className="w-6 h-6 text-blue-500" />
          <span>Home</span>
        </div>
        
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <User className="w-6 h-6 text-green-500" />
          <span>Profile</span>
        </div>
        
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <Mail className="w-6 h-6 text-purple-500" />
          <span>Messages</span>
        </div>
        
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <Settings className="w-6 h-6 text-gray-500" />
          <span>Settings</span>
        </div>
      </div>
    </main>
  )
}
