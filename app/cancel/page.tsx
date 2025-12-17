import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">Your payment was not processed. Please try again.</p>
        <Link href="/" className="text-teal-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}