import { Edit, Sparkles } from 'lucide-react'
import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import Markdown from 'react-markdown'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const WriteBlogTitles = () => {

    const blogCategories = [
        'General',
        'Technology',
        'Business',
        'Health',
        'Lifestyle',
        'Education',
        'Travel',
        'Food'
    ];

    const [selectedCategory, setSelectedCategory] = useState('General')
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState('')
    const { getToken } = useAuth()

  
    const onSubmitHandler = async (e) => {
        e.preventDefault();
        try{
            setLoading(true);
            const prompt = `Generate 10 creative and catchy blog titles for keyword "${input}" in the category "${selectedCategory}". Make each title unique.`

            const {data} = await axios.post('/api/ai/generate-blog-title',{prompt},{headers:{Authorization:`Bearer ${await getToken()}`}})
            if(data.success){
              setContent(data.content)
            } else {
              toast.error(data.message)
            }

        } catch(err){
            toast.error(err.message || "Something went wrong")
        }
        setLoading(false);
    }

    return (
        <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

            {/* Left Panel */}
            <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>
                <div className='flex items-center gap-3'>
                    <Sparkles className='w-6 text-[#4A7AFF]' />
                    <h1 className='text-xl font-semibold'>Generate Blog Titles</h1>
                </div>

                <p className='mt-6 text-sm font-medium'>Topic</p>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
                    placeholder='e.g. Future of Technology'
                    required
                />

                <p className='mt-4 text-sm font-medium'>Category</p>
                <div className='mt-3 flex gap-3 flex-wrap'>
                    {blogCategories.map((item, index) => (
                        <span
                            key={index}
                            onClick={() => setSelectedCategory(item)}
                            className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                                selectedCategory === item
                                ? 'bg-blue-50 text-blue-700 border-blue-400'
                                : 'text-gray-500 border-gray-300'
                            }`}
                        >
                            {item}
                        </span>
                    ))}
                </div>

                <button
                    disabled={loading}
                    className='w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#226BFF] to-[#65ADFF] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer'
                >
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <Edit className='w-5' />
                    )}
                    Generate Titles
                </button>
            </form>

            {/* Right Panel */}
            <div className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200 min-h-96 max-h-[600px] flex flex-col'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <Edit className='w-5 h-5 text-[#4A7AFF]' />
                        <h1 className='text-xl font-semibold'>Generated Titles</h1>
                    </div>
                </div>

                {!content ? (
                    <div className='flex-1 flex justify-center items-center'>
                        <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
                            <Edit className='w-9 h-9' />
                            <p>Enter topic & choose category to generate titles.</p>
                        </div>
                    </div>
                ) : (
                    <div className='mt-3 flex-1 overflow-y-scroll pr-2'>
                        <div className='text-[15px] leading-relaxed space-y-4 font-medium text-slate-700'>
                            {content
                                .split('\n')
                                .filter(line => line.trim() !== '')
                                .map((title, index) => (
                                    <div
                                        key={index}
                                        className="p-3 rounded-md border border-gray-200 hover:border-blue-400 hover:shadow-sm transition cursor-pointer bg-white"
                                    >
                                        <span className="font-semibold text-[#226BFF] mr-2">{index + 1}.</span>
                                        {title}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}

export default WriteBlogTitles
