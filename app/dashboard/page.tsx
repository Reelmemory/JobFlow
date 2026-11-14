export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-slate-600 mb-8">Welcome back. Here's your job search overview.</p>
      <div className="bg-white p-6 rounded-xl border">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        <p className="text-slate-500">No activity yet. Start by setting up your profile and browsing matches.</p>
      </div>
    </div>
  )
}
