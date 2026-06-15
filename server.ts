import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI model
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// REST route for AI animation instructions
app.post("/api/ai-behaviors", async (req, res) => {
  const { prompt, drawingCount, totalPoints } = req.body;

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured. Go to Settings > Secrets in AI Studio and add GEMINI_API_KEY."
    });
  }

  try {
    const finalPrompt = `
      The user wants to animate their hand-drawn 3D virtual reality sketches.
      They have drawn ${drawingCount} strokes consisting of a total of ${totalPoints} points in 3D outer-space.
      They prompted: "${prompt}".
      
      Generate a customized visual physical animation set of parameters in JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction: `You are an expert 3D physical modeling and creative visual coder.
        Your job is to generate a behavior parameter packet in JSON that specifies how line strokes in a 3D Three.js environment should move, scale, oscillate, and change color over time.
        
        The schema MUST match this structure:
        {
          "effectName": "The elegant human name of this motion behavior",
          "gravity": a float value from -2.0 to 2.0 where negative moves downwards, positive moves upwards, 0 is no gravity.
          "wind": {
            "x": wind force speed in x-axis (-1.0 to 1.0),
            "y": wind force speed in y-axis (-1.0 to 1.0),
            "z": wind force speed in z-axis (-1.0 to 1.0)
          },
          "oscillationFrequency": a float value from 0.0 to 5.0 (for wave movements, e.g. sine waving vertices),
          "oscillationAmplitude": a float value from 0.0 to 1.0 (for wave displacement),
          "rotation": {
            "x": rotational increment speed in radians per frame (-0.1 to 0.1),
            "y": rotational increment speed in radians per frame (-0.1 to 0.1),
            "z": rotational increment speed in radians per frame (-0.1 to 0.1)
          },
          "scaleSpeed": float from -0.05 to 0.05 (for breathing pulses),
          "colorMode": one of ["static", "pulse", "rainbow", "cycle", "audioReactive"],
          "colorPalette": an array of 2 to 4 Hex hexadecimal color strings representing the behavior transition aesthetic,
          "glowIntensity": float from 0.0 to 3.0,
          "particleSpawnRate": integer count (e.g. 0 to 50, if any trail particles are triggered),
          "description": "A poetic, clear description of the movement and interactive physics that this model applies (1-2 sentences)."
        }
        Do not add any other keys. Make sure your values directly reflect the requested mood or analogy of the user prompt (e.g., if they ask to make it "float like ghosts in a haunted house", make gravity slightly positive, add gentle wave oscillations, set low rotation, set color mode to 'pulse', and give pale green/blue palette Hex strings).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            effectName: { type: Type.STRING },
            gravity: { type: Type.NUMBER },
            wind: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ["x", "y", "z"]
            },
            oscillationFrequency: { type: Type.NUMBER },
            oscillationAmplitude: { type: Type.NUMBER },
            rotation: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ["x", "y", "z"]
            },
            scaleSpeed: { type: Type.NUMBER },
            colorMode: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            glowIntensity: { type: Type.NUMBER },
            particleSpawnRate: { type: Type.INTEGER },
            description: { type: Type.STRING }
          },
          required: [
            "effectName", "gravity", "wind", "oscillationFrequency",
            "oscillationAmplitude", "rotation", "scaleSpeed", "colorMode",
            "colorPalette", "glowIntensity", "particleSpawnRate", "description"
          ]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error("Gemini behavior generation failed:", error);
    return res.status(500).json({ error: error.message || "Failed to generate dynamic behavior schemas." });
  }
});

// Setup dev vs production servers
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Mode setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Virtual Reality Platform listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("Server bootstrap failed:", err);
});
