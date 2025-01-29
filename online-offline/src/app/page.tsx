export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test primary colors */}
      <header className="bg-primary-500 p-6">
        <h1 className="text-white text-3xl font-bold">Style Test</h1>
      </header>

      {/* Test spacing and typography */}
      <main className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl text-primary-700 mb-4">Color & Typography Test</h2>
          <p className="text-gray-600">This should be gray text.</p>
        </div>

        {/* Test hover effects and transitions */}
        <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors">
          Hover Me
        </button>
      </main>
    </div>
  );
}
