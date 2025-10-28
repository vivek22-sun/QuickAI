import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Heart } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'

const Community = () => {
  const [creations, setCreations] = useState([])
  const { user } = useUser()
  const [loading,setLoading]=useState(true)

  const {getToken}=useAuth()

  const handleLike = async (creationId) => {
    try {
      const response = await axios.post('/api/user/toggle-like-creation', 
        { id: creationId }, 
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      
      if (response.data.success) {
        // Refresh creations to get updated like count
        fetchCreations()
        toast.success(response.data.message)
      } else {
        toast.error(response.data.message || 'Failed to update like')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const fetchCreations = async () => {
    setLoading(true);
    try{
      const response = await axios.get('/api/user/get-published-creations', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })

      if(response.data.success){
        setCreations(response.data.creations || [])
      }
      else{
        toast.error(response.data.message || 'Failed to fetch creations')
      }

    }catch(err){
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      toast.error(errorMessage)

    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      fetchCreations()
    }
  }, [user])

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      <h1 className='text-xl font-semibold'>Creations</h1>
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll flex flex-wrap'>
        {loading ? (
          <div className='flex justify-center items-center w-full h-64'>
            <div className='text-gray-500'>Loading creations...</div>
          </div>
        ) : creations.length === 0 ? (
          <div className='flex justify-center items-center w-full h-64'>
            <div className='text-gray-500'>No published creations found.</div>
          </div>
        ) : (
          creations.map((creation, index) => (
            <div
              key={creation.id || index}
              className='relative group inline-block p-3 w-full sm:max-w-1/2 lg:max-w-1/3'
            >
              <img
                src={creation.content}
                alt='creation'
                className='w-full h-full object-cover rounded-lg'
              />
              <div className='absolute inset-0 flex flex-col justify-end p-3 text-white rounded-lg group-hover:bg-gradient-to-b from-transparent to-black/80'>
                <p className='text-sm hidden group-hover:block'>{creation.prompt}</p>
                <div className='flex gap-1 items-center justify-end'>
                  <p>{creation.likes ? creation.likes.length : 0}</p>
                  <Heart
                    onClick={() => handleLike(creation.id)}
                    className={`min-w-5 h-5 hover:scale-110 cursor-pointer ${
                      creation.likes && creation.likes.includes(user?.id)
                        ? 'fill-red-500 text-red-600'
                        : 'text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Community
