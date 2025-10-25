import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';



const app=express();

await connectCloudinary()

app.use(cors());
app.use(express.json())
app.use(clerkMiddleware())

app.get('/',async (req,res)=>{
    res.send("server is live");
})
app.use(requireAuth())

app.use('/api/ai',aiRouter)

app.use('/api/user',userRouter)

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.message === 'Only image files and PDFs are allowed!') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images and PDFs are allowed.'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
  next();
});

const PORT=process.env.PORT || 3000;

app.listen(PORT,()=>{
    console.log("Server is running on port",PORT);
})
