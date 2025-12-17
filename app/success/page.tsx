import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Thank you for your purchase.</p>
        <Link href="/" className="text-teal-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}