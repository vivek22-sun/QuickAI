import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Eraser, Download } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const RemoveObject = () => {
  const [input, setInput] = useState(null); // file input
  const [object, setObject] = useState(''); // object name
  const [content, setContent] = useState(null); // processed image (base64)
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input || !object.trim()) return toast.error('Please upload an image and enter object name');
    if (object.split(' ').length > 1) return toast.error('Please enter only one object name');

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', input);
      formData.append('object', object.trim());

      const token = await getToken();
      const { data } = await axios.post('/api/ai/remove-image-object', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setContent(data.content);
        toast.success('Object removed successfully!');
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!content) return;
    setDownloadLoading(true);
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${content}`;
    link.download = `processed_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadLoading(false);
    toast.success('Image downloaded successfully!');
  };

  return (
    <div className="w-full min-h-screen bg-[#f7f8fa] flex items-center justify-center">
      <div className="w-full max-w-6xl flex flex-row gap-6 px-2 py-8">

        {/* Object Removal Section */}
        <div className="bg-white rounded-xl p-8 shadow flex-1 flex flex-col border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 text-[#6770e6]" />
            <h2 className="text-2xl font-semibold text-slate-700">Object Removal</h2>
          </div>

          <label className="font-medium text-sm mb-2">Upload image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full mb-5 px-4 py-3 rounded border border-gray-300 text-sm text-gray-700 bg-[#f8f9fb] font-medium focus:outline-none"
            onChange={e => setInput(e.target.files[0])}
            required
          />

          <label className="font-medium text-sm mb-2">Describe object name to remove</label>
          <textarea
            className="w-full resize-none mb-7 px-4 py-3 rounded border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 bg-[#f8f9fb] font-medium"
            value={object}
            onChange={e => setObject(e.target.value)}
            placeholder="e.g., watch or spoon , Only single object name"
            rows={3}
            required
          />

          <button
            type="submit"
            onClick={onSubmitHandler}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#6770e6] to-[#8530e4] text-white text-base font-medium py-3 rounded-md flex items-center justify-center gap-2 shadow transition hover:scale-[1.02] hover:shadow-lg"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Eraser className="w-5" /> Remove object
              </>
            )}
          </button>
        </div>

        {/* Processed Image Section */}
        <div className="bg-white rounded-xl p-8 shadow flex-1 min-h-[300px] flex flex-col items-center justify-center border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Eraser className="w-6 text-[#6770e6]" />
            <h2 className="text-2xl font-semibold text-slate-700">Processed Image</h2>
          </div>

          {content ? (
            <>
              <img
                src={`data:image/png;base64,${content}`}
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
          ) : input ? (
            <div className="flex flex-col items-center gap-4 text-gray-400 mt-2">
              <span className="text-base text-center">Processing image...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400 mt-2">
              <Eraser className="w-10 h-10" />
              <p className="text-base text-center">
                Upload an image and click "Remove Object" to get started
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default RemoveObject;
