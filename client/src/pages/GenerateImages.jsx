import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const ImageStyles = [
  'Realistic', 'Ghibli style', 'Anime style', 'Cartoon style',
  'Fantasy style', 'Realistic style', '3D style', 'Portrait style'
];

export default function AIImageGenerator() {
  const [selectedStyle, setSelectedStyle] = useState('Realistic');
  const [input, setInput] = useState('');
  const [publish, setPublish] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prompt = `Generate the image of "${input}" in a "${selectedStyle}" style.`;

      const { data } = await axios.post(
        '/api/ai/generate-image',
        { prompt, publish },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (data.success) {
        setGeneratedImage(data.content);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const downloadImage = async () => {
    if (!generatedImage) return;
    try {
      setDownloadLoading(true);
      const response = await axios.get(generatedImage, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ai_image_${Date.now()}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download image.');
      console.error(err);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-8 flex flex-wrap gap-8 justify-center bg-gray-50 text-slate-700">

      {/* Left Panel */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2 text-green-600 mb-6">
          AI Image Generator
        </h1>

        <label className="block mb-6">
          <span className="text-base font-medium">Describe Your Image</span>
          <textarea
            className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-3 resize-none h-24 focus:outline-none focus:border-green-500 shadow-sm"
            placeholder="Describe what you want to see..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>

        <p className="text-base font-medium mb-2">Select Style</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {ImageStyles.map((style) => (
            <button
              key={style}
              type="button"
              disabled={loading}
              onClick={() => setSelectedStyle(style)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all hover:scale-105 transform ${
                selectedStyle === style
                  ? 'bg-green-100 text-green-700 border-green-400 shadow-inner'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Custom Toggle for "Public" */}
        <div className="flex items-center gap-3 mb-6">
          <label className="relative cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={() => setPublish(!publish)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition"></div>
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-6 shadow"></span>
          </label>
          <span className="text-sm font-medium">Make this image Public</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-3 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold text-base shadow-lg transition-all hover:from-green-600"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            'Generate Image'
          )}
        </button>
      </form>

      {/* Right Panel */}
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-green-600 mb-6">
          Generated Image
        </h1>

        {!generatedImage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 64 64">
              <rect x="12" y="16" width="40" height="32" rx="3" strokeWidth="2" />
              <circle cx="26" cy="29" r="4" strokeWidth="2" />
              <path d="M20 46l7.5-10 7.5 10 10-15" strokeWidth="2" />
            </svg>
            <p className="text-center text-base">Describe an image and click "Generate Image" to get started</p>
          </div>
        ) : (
          <>
            <img
              src={generatedImage}
              alt="Generated"
              className="max-w-full h-64 rounded-xl shadow-lg border mb-4"
            />
            <button
              onClick={downloadImage}
              disabled={downloadLoading}
              className="w-full flex justify-center items-center gap-3 py-3 rounded-xl bg-blue-600 text-white font-semibold text-base shadow-lg transition-all hover:bg-blue-700"
            >
              {downloadLoading ? (
                <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Download Image'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
