const apiKey = process.env.OPENAI_API_KEY;
const model = "gpt-4o-mini";
const openAiUrl = "https://api.openai.com/v1";

export async function getEmbeddings(text) {
  try {
    const response = await fetch(`${openAiUrl}/embeddings`, {
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
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error getting embeddings:", error);
    throw error;
  }
}

export async function getCompletion(prompt) {
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ]
  };

  try {
    const response = await fetch(`${openAiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return { content, error: null };
  } catch (error) {
    console.error("Chat completion error:", error);
    return { content: null, error };
  }
}

export async function classifyText(text) {
  const prompt = `Analyze the following sentence and determine whether it is a question or a statement. 
  The sentence may not have punctuation, so consider its structure and wording. 
  Respond with only 'question' or 'statement' and nothing else.

  Sentence: ${text}`;

  const response = await getCompletion(prompt);
  const classification = parseCodeBlock(response.content);
  
  return classification;
}

export async function getEntities(statement) {
  const prompt = `Identify and extract entities from the following statement.
    Categorize them into these types: Person, Organization, Occupation, Place, Product, Service, Event, Skill, religion, thing.
    Return the result as a JSON object where keys are entity types and values are arrays of entity names.
  
    Statement: "${statement}"
  
    JSON Output:`;

  const response = await getCompletion(prompt);
  const entities = parseCodeBlock(response.content);

  // remove empty arrays
  for (const key in entities) {
    if (entities[key].length === 0) {
      delete entities[key];
    }
  }

  return entities;
}

export async function getRelationships(statement, entities) {
  const prompt = `Identify relationships in the following statement and express them as Subject-Verb-Object triples.
    Use the entities provided below and resolve pronouns to the correct entity where possible.
    The Subject and Object in each triple should be chosen from the identified entities.
  
    Statement: "${statement}"
  
    Entities: ${JSON.stringify(entities, null, 2)}
  
    Triples (JSON Array of Objects with "subject", "verb", "object" keys):`;

  const response = await getCompletion(prompt);
  const relationships = parseCodeBlock(response.content);

  return relationships;
}

export function parseCodeBlock(text) {
  const start = text.lastIndexOf("```", -3);
  let json = null;

  if (start !== -1) {
    // Remove the first and last "```"
    const end = text.lastIndexOf("```");
    let cleanedText = text.substring(start + 3, end);

    // Remove any language specifier after the opening "```" if present
    if (cleanedText.startsWith("json")) {
      cleanedText = cleanedText.substring(4).trimStart(); // Remove "json" and leading whitespace
    }

    cleanedText = cleanedText.trim();
    console.log("Cleaned text:", cleanedText);

    try {
      json = JSON.parse(cleanedText);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }

    return json
  }

  try {
    // Try to parse the entire text as JSON
    return JSON.parse(text);
  } catch (error) {
    return [];
  }
}

