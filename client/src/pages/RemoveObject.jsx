import React, { useState } from 'react'
import { Sparkles, Eraser } from 'lucide-react'

const RemoveObject= () => {
  const [_inputImage, setInputImage] = useState(null)
  const [prompt, setPrompt] = useState('')

  const onSubmitHandler = async e => {
    e.preventDefault()
    // API logic goes here
  }

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
            type='file'
            accept='image/*'
            className='w-full mb-5 px-4 py-3 rounded border border-gray-300 text-sm text-gray-700 bg-[#f8f9fb] font-medium focus:outline-none'
            onChange={e => setInputImage(e.target.files[0])}
            required
          />
          <label className="font-medium text-sm mb-2">Describe object name to remove</label>
          <textarea
            className="w-full resize-none mb-7 px-4 py-3 rounded border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 bg-[#f8f9fb] font-medium"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., watch or spoon , Only single object name"
            rows={3}
            required
          />
          <button
            type="submit"
            onClick={onSubmitHandler}
            className="w-full mt-2 bg-gradient-to-r from-[#6770e6] to-[#8530e4] text-white text-base font-medium py-3 rounded-md flex items-center justify-center gap-2 shadow transition hover:scale-[1.02] hover:shadow-lg"
          >
            <Eraser className="w-5" />
            Remove object
          </button>
        </div>

        {/* Processed Image Section */}
        <div className="bg-white rounded-xl p-8 shadow flex-1 min-h-[300px] flex flex-col items-center justify-center border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Eraser className="w-6 text-[#6770e6]" />
            <h2 className="text-2xl font-semibold text-slate-700">Processed Image</h2>
          </div>
          <div className="flex flex-col items-center gap-4 text-gray-400 mt-2">
            <Eraser className="w-10 h-10" />
            <p className="text-base text-center">
              Upload an image and click "Remove Object" to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemoveObject
