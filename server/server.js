const originalLog = console.log;
console.log = function(...args) {
    originalLog.apply(console, [`[${new Date().toISOString()}]`, ...args]);
};

import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getEmbeddings, getCompletion, getEntities, getRelationships, classifyText, sentenceClassification } from "./utils/llm.js";
import { updateGraphDB, getFacts} from "./utils/graphdb.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const apiKey = process.env.OPENAI_API_KEY;
const realtimeApiUrl = "https://api.openai.com/v1/realtime/sessions";
const userConversationCache = new Map(); // Maps user_item_id to user conversation item

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

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
      realtimeApiUrl,
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
      type: "signup",
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
      type: "email"
    });

    if (error) {
      console.error("Auth verification error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Redirect to the main application after successful verification
    res.redirect("/?verified=true");
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

async function saveConversationItem(item) {
  item.embeddings = await getEmbeddings(item.content);

  if (item.role === "user") {
    item.classification_id = await classifyText(item);
    userConversationCache.set(item.item_id, item);
  } else {
    if (item.input_item_id) {
      const userItem = userConversationCache.get(item.input_item_id);
      item.classification_id = userItem?.classification_id + 2;
      userConversationCache.delete(item.input_item_id);
    }  
  }

  console.log("Conversation item:", item);
  const { data, error } = await supabase
    .from("conversation_items")
    .insert([item]);

  return { classification: sentenceClassification[item.classification_id], data, error };
}

// Modify the save-conversation-item handler to include embeddings
app.post("/save-conversation-item", async (req, res) => {
  let response;
  const { item } = req.body;
  console.log("Save conversation item:", item);

  if (!item.content || (item.role ==="assistant" && !item.input_item_id)) {
    return res.status(200).json({ data: "Content and item ID are required for conversation items" });
  }

  try {
    const {classification, error} = await saveConversationItem(item);
    if (error) {
      console.log("Error in saveConversationItem response:", item, error);
      return res.status(400).json({ error });
    }

    if (item.role === "user") {  
      if (classification === "Statement") {
        // entities is an object with keys that are entity types and values that are arrays of entity names
        const entities = await getEntities(item.content);
        console.log("Extracted entities:", entities);
  
        if (Object.keys(entities).length > 0) {
          const relationships = await getRelationships(item.content, entities);
          console.log("Extracted relationships:", relationships);
    
          response = updateGraphDB(entities, relationships);
          return res.status(response.code).json(response);
        }
      } else {
      // Question
      const embeddings = await getEmbeddings(item.content);
      const { data: contextData, error: contextError } = await supabase
        .rpc("match_conversation_items", {
          match_count: 3,
          match_threshold: 0.8,
          query_embeddings: embeddings});
      
      if (contextError) {
        return res.status(400).json({ error: contextError.message });
      }

      const context = contextData.map(item => ({
        item_id: item.item_id,
        role: item.role,
        topic: item.topic,
        user: item.user,
        type: 'context',
        session: item.session,
        content: item.content,
        input_item_id: item.input_item_id,
        classification: item.classification,
        similarity: item.similarity
      }));

      // Return context for the given question
      return res.json({ context });
    }
  }

    // Use vector search to find similar items for context
    res.status(200).json({ message: "Conversation item saved successfully" });
  } catch (error) {
    console.error("Error saving conversation item:", item, error);
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

app.post("/get-facts", async (req, res) => {
  console.log("Get facts request:", req.body);
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }

  try {
    const entities = await getEntities(query);
    const facts = await getFacts(entities); // Assuming getFacts is your function to fetch facts
    res.json({ facts });
  } catch (error) {
    console.error("Error fetching facts:", error);
    res.status(500).json({ error: "Failed to fetch facts." });
  }
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

app.listen(port, "localhost", () => {
  console.log(`Express server running on *:${port}`);
});
