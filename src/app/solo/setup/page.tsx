"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, MapPin, CheckCircle } from "lucide-react";

export default function SoloSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    workshopName: "",
    address: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call to save workshop profile and create tenant
    setTimeout(() => {
      setLoading(false);
      setStep(3); // Success step
    }, 1500);
  };

  const goToDashboard = () => {
    router.push("/solo/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 px-4 py-8 max-w-md w-full mx-auto flex flex-col">
        {step < 3 && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Setup Your Workshop</h1>
            <div className="flex items-center mt-4 space-x-2">
              <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Step {step} of 2</p>
          </div>
        )}

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <Store className="w-12 h-12 text-blue-600 mx-auto mb-4 bg-blue-50 p-2 rounded-full" />
                <h2 className="text-xl font-semibold">Business Details</h2>
                <p className="text-sm text-gray-500">What is the name of your garage?</p>
              </div>
              
              <div>
                <label htmlFor="workshopName" className="block text-sm font-medium text-gray-700">
                  Workshop Name
                </label>
                <input
                  type="text"
                  id="workshopName"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="e.g. Mike's Auto Repair"
                  value={formData.workshopName}
                  onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                />
              </div>

              <button
                onClick={handleNext}
                disabled={formData.workshopName.length < 3}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4 bg-blue-50 p-2 rounded-full" />
                <h2 className="text-xl font-semibold">Location</h2>
                <p className="text-sm text-gray-500">Where is your workshop located?</p>
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-lg mb-4"
                  placeholder="Street Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="w-1/3 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || formData.city.length < 2}
                  className="w-2/3 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {loading ? "Saving..." : "Finish Setup"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-in zoom-in duration-500">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Set!</h2>
                <p className="mt-2 text-gray-600">
                  Your workshop profile is ready. For the best experience, install this app to your home screen.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={goToDashboard}
                  className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-md text-lg font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all hover:scale-105"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
