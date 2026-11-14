export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-slate-600 mb-8">Welcome back. Here's your job search overview.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">12</div>
          <div className="text-sm text-slate-500">Matches today</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-green-600">3</div>
          <div className="text-sm text-slate-500">Applications sent</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-amber-600">1</div>
          <div className="text-sm text-slate-500">Interviews</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        <p className="text-slate-500">No activity yet. Start by setting up your profile and browsing matches.</p>
      </div>
    </div>
  )
}
