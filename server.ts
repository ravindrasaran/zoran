import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";
import path from "path";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (e.g., Nginx, Cloud Run) to correctly populate req.ip
  app.set('trust proxy', 1);

  app.use(express.json());

  // Rate Limiting: Max 500 requests per minute per IP
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
    },
    keyGenerator: (req) => {
      const forwarded = req.headers['forwarded'];
      if (forwarded && typeof forwarded === 'string') {
        const match = forwarded.match(/for="?([^;"]+)"?/);
        if (match) return match[1];
      }
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (xForwardedFor && typeof xForwardedFor === 'string') {
        return xForwardedFor.split(',')[0].trim();
      }
      return req.ip || 'unknown';
    }
  });

  // Apply rate limiter to API routes
  app.use("/api/", apiLimiter);

  // API Route to fetch RBSE results
  app.get("/api/result/:rollNumber", async (req, res) => {
    const { rollNumber } = req.params;
    
    try {
      const RBSE_URL = "http://rajresults.nic.in/resbserx19.htm"; 
      
      const params = new URLSearchParams();
      params.append('roll_no', rollNumber);
      params.append('B1', 'Submit');

      const response = await axios.post(RBSE_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 15000 
      });
      
      const html = response.data;
      const $ = cheerio.load(html);

      if (html.includes("Not Found") || html.includes("Invalid Roll Number") || html.includes("Please enter valid Roll Number")) {
        return res.status(404).json({ error: "Roll Number Not Found" });
      }

      // Keyword-based parsing
      const name = $("body").text().match(/Name\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || "Unknown Student";
      
      const subjects: any[] = [];
      let totalMarks = 0;
      
      // Keyword-based subject parsing (assuming a table structure)
      $("table tr").each((i, el) => {
        const text = $(el).text();
        if (text.includes("Subject") || text.includes("Total")) return;
        
        const tds = $(el).find("td");
        if (tds.length >= 4) {
          const subject = tds.eq(0).text().trim();
          const total = parseInt(tds.eq(3).text().trim()) || 0;
          
          if (subject && total > 0) {
             subjects.push({ subject, total_marks: total });
             totalMarks += total;
          }
        }
      });

      const resultStatus = html.includes("FAIL") ? "FAIL" : "PASS";

      res.json({
        name,
        roll_no: rollNumber,
        subject_wise_marks: subjects,
        total_marks: totalMarks,
        result_status: resultStatus
      });

    } catch (error: any) {
      console.error("Scraping error:", error);
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        res.status(503).json({ error: "The official RBSE result server is currently unreachable. Please try again later." });
      } else {
        res.status(500).json({ error: "Official server is busy, please try again in a few minutes." });
      }
    }
  });

  // API Route to fetch School-wise results
  app.get("/api/school-result/:schoolCode", async (req, res) => {
    const { schoolCode } = req.params;
    
    try {
      // Implement school-wise scraping logic here
      // This is a placeholder as the actual URL/structure is unknown
      res.json({
        school_code: schoolCode,
        students: [
          { roll_no: "100001", name: "Student 1", result_status: "PASS" },
          { roll_no: "100002", name: "Student 2", result_status: "PASS" }
        ]
      });
    } catch (error: any) {
      console.error("School scraping error:", error);
      res.status(500).json({ error: "Failed to fetch school results." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

