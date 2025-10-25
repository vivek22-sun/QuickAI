import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'

const Navbar = () => {
  const navigate = useNavigate()
  const { user } = useUser()
  const { openSignIn } = useClerk()

  return (
    <div className='fixed z-10 w-full backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32'>
      {/* Logo */}
      <img 
        src={assets.logo} 
        alt="logo" 
        className='w-32 sm:w-44 cursor-pointer' 
        onClick={() => navigate('/')} 
      />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {user ? (
          <UserButton />
        ) : (
          <>
            <button
              className='rounded-full border border-black text-black px-6 py-2.5'
              onClick={() => openSignIn()}
            >
              Login
            </button>
            <button 
              className='flex items-center gap-2 rounded-full text-sm cursor-pointer bg-primary text-white px-8 py-2.5'
              onClick={() => navigate('/ai')}
            >
              Get Started 
              <ArrowRight className='w-4 h-4' />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Navbar
