const apiKey = process.env.OPENAI_API_KEY;
const model = "gpt-4o-mini";
const openAiUrl = "https://api.openai.com/v1";
export const sentenceClassification = ["SELECT", "Question", "Statement", "Answer", "Comment"]; // from public.classification table

// Takes a string and returns a vector (Array[1536])
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

// Takes a prompt string and returns a completion string
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

// Creates a prompt to classify text as a question or statement and returns 'statement' or 'question'
export async function classifyText(item) {
  const prompt = `Analyze the following sentence and determine whether it is a question or a statement. 
  The sentence may not have punctuation, so consider its structure and wording. 
  Respond with only 'Question' or 'Statement' and nothing else.

  Sentence: ${item.content}`;

  const { content } = await getCompletion(prompt);

  return sentenceClassification.indexOf(content);
}

// Takes a statement and returns an object with entity labels as keys and arrays of entity names as values
export async function getEntities(statement, user) {
  const prompt = `Identify and extract entities from the following statement.
     The statement may contain self-references (like "I", "I'm", etc.) which should be treated as referring to a person named "${user}".
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

// Takes a statement and an object with entity labels and returns an array of relationship triples (subject, verb, object)
export async function getRelationships(statement, entities) {
  const prompt = `Identify relationships in the following statement and express them as Subject-Verb-Object triples.
    Use the entities provided below and resolve pronouns to the correct entity where possible.
    The Subject and Object in each triple should be chosen from the identified entities. The verb should be the action 
    or relationship between the subject and object formatted as UPPER_CASE_WITH_UNDERSCORES.
      
    Statement: "${statement}"
  
    Entities: ${JSON.stringify(entities, null, 2)}
  
    Return triples (JSON Array of Objects with "subject", "verb", "object" keys):`;

  const response = await getCompletion(prompt);
  const relationships = parseCodeBlock(response.content);

  return relationships;
}

// Taks the reponse from the LLM and extracts the last code block as JSON
export function parseCodeBlock(text) {
  const end = text.lastIndexOf("```");
  const start = text.lastIndexOf("```", end - 1);
  let json = null;

  if (start !== -1) {
    // Remove the first and last "```"
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
