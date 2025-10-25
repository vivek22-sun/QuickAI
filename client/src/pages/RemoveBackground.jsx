import React, { useState } from 'react';
import { Sparkles, Eraser, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export default function RemoveBackground() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const { data } = await axios.post('/api/ai/remove-image-background', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        setProcessedImage(data.content); // adjust if backend returns base64
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }

    setLoading(false);
  };

  const downloadImage = () => {
    if (!processedImage) return;

    setDownloadLoading(true);
    const link = document.createElement('a');
    link.href = processedImage;
    link.setAttribute('download', `processed_image_${Date.now()}.png`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadLoading(false);
    toast.success('Image downloaded successfully!');
  };

  return (
    <div className="h-full overflow-y-scroll p-8 flex flex-wrap gap-8 justify-center bg-gray-50 text-slate-700">

      {/* Left Panel */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200"
      >
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 text-[#8E37EB]" />
          <h1 className="text-2xl font-bold">AI Background Remover</h1>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium">Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none shadow-sm"
            required
          />
          <p className="text-xs text-gray-500 font-light mt-1">
            Supports JPG, PNG, and other image formats
          </p>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-3 py-3 rounded-xl bg-gradient-to-r from-[#F6AB41] to-[#FF4938] text-white font-semibold text-base shadow-lg transition-all hover:from-[#FFB75E]"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <Eraser className="w-5" /> Remove Background
            </>
          )}
        </button>
      </form>

      {/* Right Panel */}
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <Eraser className="w-5 h-5 text-[#FF4938]" />
          <h1 className="text-2xl font-bold">Processed Image</h1>
        </div>

        {!processedImage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm">
            <Eraser className="w-12 h-12 mb-4" />
            <p className="text-center text-base">
              Upload an image and click "Remove Background" to get started
            </p>
          </div>
        ) : (
          <>
            <img
              src={processedImage}
              alt="Processed"
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
                <>
                  <Download className="w-5" /> Download Image
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
