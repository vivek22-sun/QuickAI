import React, { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const ReviewResume = () => {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!resume) return toast.error('Please upload a resume file');

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('resume', resume);

      const token = await getToken();
      const { data } = await axios.post('/api/ai/resume-review', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setContent(data.content);
        toast.success('Resume reviewed successfully!');
      } else {
        toast.error(data.error || 'Failed to review resume');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full min-h-screen bg-[#f7f8fa] flex items-center justify-center'>
      <div className='w-full max-w-6xl flex gap-6 px-4 py-10'>

        {/* Left Panel: Resume Upload */}
        <div className='bg-white border border-gray-100 rounded-xl shadow flex-1 p-8 flex flex-col'>
          <div className='flex items-center gap-2 mb-6'>
            <Sparkles className='w-6 text-[#23be94]' />
            <h2 className='text-2xl font-semibold'>Resume Review</h2>
          </div>

          <label className='text-base font-medium mb-2'>Upload Resume</label>
          <input
            type='file'
            accept='.pdf,.png,.jpg'
            onChange={e => setResume(e.target.files[0])}
            className='mb-2 w-full px-4 py-3 rounded border border-gray-300 text-sm text-gray-700 bg-[#f8f9fb] font-medium focus:outline-none'
            required
          />
          <p className='mb-7 text-sm text-gray-400'>Supports PDF, PNG, JPG formats</p>

          <button
            type='submit'
            onClick={onSubmitHandler}
            disabled={loading}
            className='w-full mt-2 bg-gradient-to-r from-[#23be94] to-[#17b7c7] text-white text-base font-semibold py-3 rounded-md flex items-center justify-center gap-2 shadow transition hover:scale-[1.02] hover:shadow-lg'
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <FileText className='w-5' /> Review Resume
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Analysis Results */}
        <div className='bg-white border border-gray-100 rounded-xl shadow flex-1 min-h-[300px] p-8 flex flex-col'>
          <div className='flex items-center gap-2 mb-6'>
            <FileText className='w-6 text-[#17b7c7]' />
            <h2 className='text-2xl font-semibold'>Analysis Results</h2>
          </div>

          {content ? (
            <div className="w-full overflow-y-auto text-gray-800">
              {content.split('\n').map((line, idx) => (
                <p key={idx} className="mb-2">{line}</p>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400 mt-2">
              <FileText className="w-10 h-10" />
              <p className="text-base text-center">
                Upload your resume and click "Review Resume" to get started
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default ReviewResume;
