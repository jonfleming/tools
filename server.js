import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const model = "gpt-4o-mini";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Add this function after the imports and before the route handlers
async function getEmbeddings(text) {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error getting embeddings:", error);
    throw error;
  }
}

async function getCompletion(prompt) {
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ]
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return { content, error: null };
  } catch (error) {
    console.error("Chat completion error:", error);
    return {content: null, error};
  }
}

async function getEntities(statement) {
  const prompt = `Identify and extract entities from the following statement.
  Categorize them into these types: Person, Organization, Job Title, Place, Product, Service.
  Return the result as a JSON object where keys are entity types and values are arrays of entity names.

  Statement: "${statement}"

  JSON Output:`;  


  const response = await getCompletion(prompt);

  return response;
}

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "sage",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ user });
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

app.post("/signout", async (req, res) => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ message: "User signed out" });
});

// Add this with your other auth endpoints
app.post("/resend-confirmation", async (req, res) => {
  const { email } = req.body;
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: "Confirmation email resent successfully" });
  } catch (err) {
    console.error("Resend confirmation error:", err);
    res.status(500).json({ error: "Failed to resend confirmation email" });
  }
});

// Update the /auth endpoint to handle email confirmation
app.post("/auth", async (req, res) => {
  try {
    const { access_token } = req.body;
    
    // Exchange the tokens received from the email confirmation
    const { error } = await supabase.auth.verifyOtp({
      token_hash: access_token,
      type: 'email'
    });

    if (error) {
      console.error("Auth verification error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Redirect to the main application after successful verification
    res.redirect('/?verified=true');
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Modify the save-conversation-item handler to include embeddings
app.post("/save-conversation-item", async (req, res) => {
  const { item } = req.body;

  if (!item.content || (item.role ==='assistan' && !item.input_item_id)) {
    return res.status(200).json({ data: "Content and item ID are required for conversation items" });
  }

  try {
    // Get embeddings for the content
    const embeddings = await getEmbeddings(item.content);
    const { data, error } = await supabase
      .from('conversation_items')
      .insert([{ 
        content: item.content,
        role: item.role,
        item_id: item.item_id,
        input_item_id: item.input_item_id,
        type: item.type,
        user: item.user,
        session: item.session,
        topic: item.topic,
        embeddings: embeddings // Add embeddings to the database record
      }]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (item.role === 'user') {
      const entities = await getEntities(item.content);
      console.log("Extracted entities:", entities);
    }

    res.json({ data });
  } catch (error) {
    console.error("Error saving conversation item:", error);
    res.status(500).json({ error: "Failed to save conversation item" });
  }
});

app.post("/extract-entity", async (req, res) => {  
  const { statement } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text is required for completions" });
  }
  
  const { content, error } = await getEntities(statement);
  
  if (error) {
    return res.status(400).json({ error });
  }

  const entities = JSON.parse(content);
  const response = { entities };  
  
  return res.json({ response });
});

app.post("/topic", async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text is required for completions" });
  }

  const prompt = `Extract a short title from this text: ${text}`;

  const { content, error } = await getCompletion(prompt);
  
  if (error) {
    return res.status(400).json({ error });
  }
  
  return res.json({ content });    
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
