import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fs from "fs";
import puppeteer from "puppeteer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);


const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length = 500 } = req.body;
    const plan = req.plan || "free";
    const free_usage = req.free_usage || 0;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    if (plan !== "premium" && free_usage >= 10) {
      return res.status(403).json({ success: false, message: "Limit reached. Upgrade to continue" });
    }

    // Limit tokens safely
    const maxTokens = Math.min(Math.floor(length * 2), 1024); 

    const response = await client.chat.completions.create({
      model: "gemini-2.0-flash-exp",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ success: false, message: "No content returned from Gemini API" });
    }

    // Save to DB
    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${content}, 'article', false)
    `;

    // Update usage for free users
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    return res.json({ success: true, content });
  } catch (err) {
    console.error("Article generation error:", err.message || err);
    if (err.message && err.message.includes("API key")) {
      return res.status(500).json({ success: false, message: "AI service configuration error" });
    }
    if (err.message && err.message.includes("quota")) {
      return res.status(429).json({ success: false, message: "AI service rate limit reached. Please try again later." });
    }
    return res.status(500).json({ success: false, message: "Failed to generate article" });
  }
};


export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length = 500 } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    const response = await client.chat.completions.create({
      model: "gemini-2.0-flash-exp",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${content}, 'article', false)
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    return res.json({ success: true, content });
  } catch (err) {
    console.error("Blog title generation error:", err.message || err);
    if (err.message && err.message.includes("API key")) {
      return res.status(500).json({ success: false, message: "AI service configuration error" });
    }
    if (err.message && err.message.includes("quota")) {
      return res.status(429).json({ success: false, message: "AI service rate limit reached. Please try again later." });
    }
    return res.status(500).json({ success: false, message: "Failed to generate blog title" });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish = false } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const data = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": process.env.CLIPDROP_API_KEY,
      },
      responseType: "arraybuffer",
    });

    const base64Image = `data:image/png;base64,${Buffer.from(data.data, "binary").toString("base64")}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish})
    `;

    return res.json({ success: true, content: secure_url });
  } catch (err) {
    // Handle API errors with meaningful responses
    if (err.response) {
      const status = err.response.status;
      const headers = err.response.headers;
      
      // Handle Clipdrop-specific errors
      if (headers['x-unacceptable-content-detected'] === 'true') {
        const contentType = headers['x-unacceptable-content-type'];
        console.error(`Clipdrop rejected content (${contentType}):`, err.message);
        return res.status(422).json({ 
          success: false, 
          message: `Image generation rejected: ${contentType.toUpperCase()} content detected. Please use a different prompt.` 
        });
      }
      
      if (status === 403) {
        console.error("Clipdrop API authentication failed:", err.message);
        return res.status(403).json({ 
          success: false, 
          message: "API authentication failed. Please check server configuration." 
        });
      }
      
      if (status >= 400 && status < 500) {
        console.error(`Clipdrop API error (${status}):`, err.message);
        return res.status(status).json({ 
          success: false, 
          message: `Image generation failed: ${err.message}` 
        });
      }
    }
    
    console.error("Image generation error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "remove_the_background",
        },
      ],
    });

    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image', true)
    `;

    return res.json({ success: true, content: secure_url });
  } catch (err) {
    console.error("Background removal error:", err.message || err);
    if (err.message && err.message.includes("Invalid")) {
      return res.status(400).json({ success: false, message: "Invalid image format or file" });
    }
    return res.status(500).json({ success: false, message: "Failed to process image" });
  }
};

export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const plan = req.plan;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(req.file.path);

    const image_url = cloudinary.url(public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: "image",
    });

    // Save the URL to database for community display
    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${image_url}, 'image', true)
    `;

    // Fetch the processed image and convert to base64 for frontend display
    const imageResponse = await fetch(image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Content = Buffer.from(imageBuffer).toString('base64');

    return res.json({ success: true, content: base64Content });
  } catch (err) {
    console.error("Object removal error:", err.message || err);
    if (err.message && err.message.includes("Invalid")) {
      return res.status(400).json({ success: false, message: "Invalid image format or file" });
    }
    if (err.message && err.message.includes("fetch")) {
      return res.status(500).json({ success: false, message: "Failed to process generated image" });
    }
    return res.status(500).json({ success: false, message: "Failed to remove object from image" });
  }
};

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (!resume) return res.status(400).json({ success: false, message: 'No resume uploaded' });
    if (plan !== 'premium') return res.json({ success: false, message: 'Limit reached. Upgrade to continue' });
    if (resume.size > 5 * 1024 * 1024) return res.json({ success: false, message: 'Resume size must be less than 5MB' });

    // Dynamic import of pdf-parse within the function
    const pdfParse = require('pdf-parse');
    
    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdfParse(dataBuffer);

    const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume Content:\n\n${pdfData.text}`;

    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash-exp',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)  
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review', false)
    `;

    return res.json({ success: true, content });
  } catch (err) {
    console.error("Resume review error:", err.message || err);
    if (err.message && err.message.includes("PDF")) {
      return res.status(400).json({ success: false, message: "Invalid PDF file or corrupted file" });
    }
    if (err.message && err.message.includes("API")) {
      return res.status(500).json({ success: false, message: "AI service error. Please try again." });
    }
    return res.status(500).json({ success: false, message: "Failed to review resume" });
  }
};

export const generateArticlePDF = async (req, res) => {
  try {
    const { content, title = "Generated Article" } = req.body;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ success: false, message: "Article content is required" });
    }

    // Create HTML template for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #333;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 3px solid #4A7AFF;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        h2 {
          color: #34495e;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          color: #4A7AFF;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        p {
          margin-bottom: 15px;
          text-align: justify;
        }
        ul, ol {
          margin-bottom: 15px;
          padding-left: 30px;
        }
        li {
          margin-bottom: 8px;
        }
        blockquote {
          border-left: 4px solid #4A7AFF;
          padding-left: 20px;
          margin: 20px 0;
          font-style: italic;
          background-color: #f8f9fa;
          padding: 15px 20px;
        }
        code {
          background-color: #f4f4f4;
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        pre {
          background-color: #f4f4f4;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div id="content">
        ${content.split('\n').map(line => {
          if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
          if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
          if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
          if (line.startsWith('* ') || line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
          if (line.trim() === '') return '<br>';
          return `<p>${line}</p>`;
        }).join('')}
      </div>
      <div class="footer">
        <p>Generated by QuickAi - ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
    `;

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });
    
    await browser.close();
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
};
