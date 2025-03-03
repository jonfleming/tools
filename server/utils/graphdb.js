import neo4j from 'neo4j-driver'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(
        process.env.NEO4J_USER,
        process.env.NEO4J_PASSWORD
    )
)

function transformVerbToRelationshipType(verb) {
  // 1. Uppercase the verb
  let upperCaseVerb = verb.toUpperCase();

  // 2. Replace spaces with underscores
  let relationshipType = upperCaseVerb.replace(/\s+/g, "_"); // Use regex for all spaces

  return relationshipType;
}

function generateCypherMergeStatement(entities, triple, nodes) {
  const { subject, verb, object } = triple;
  const cypherLines = [];

  // 1. Transform the verb to relationship type
  const relationshipType = transformVerbToRelationshipType(verb);

  // 2. Find subject and object in the entities list
  const subjectVar = subject.replace(/\s+/g, "_");
  const objectVar = object.replace(/\s+/g, "_");
  const subjectEntityLabel = getEntityLabel(entities, subject);
  const objectEntityLabel = getEntityLabel(entities, object);

  if (subjectEntityLabel && objectEntityLabel) {
    const entity1 = `${subjectVar}:${subjectEntityLabel} {name: '${subject}'}`;
    const entity2 = `${objectVar}:${objectEntityLabel} {name: '${object}'}`;
    if (!nodes.has(subjectVar)) {
      cypherLines.push(`MERGE (${entity1})`);
      nodes.add(subjectVar);
    }
    if (!nodes.has(objectVar)) {
      cypherLines.push(`MERGE (${entity2})`);
      nodes.add(objectVar);
    }
    cypherLines.push(`MERGE (${subjectVar})-[:${relationshipType}]->(${objectVar})`);
  }

  // 3. Construct the Cypher MERGE statement
  const cypherStatement = cypherLines.join("\n");

  return cypherStatement;
}

function getEntityLabel(entities, entityName) {
  return Object.keys(entities).find(label => entities[label].includes(entityName)) || null;
}

function generateCypherStatementsForTriples(entities, triples) {
  const nodes = new Set(); // To keep track of merged nodes
  const cypher = triples.map((triple) => generateCypherMergeStatement(entities, triple, nodes)).join("\n");
  
  return cypher;
}

function formatRelationship(relationship) {
  return relationship
      .toLowerCase()    // Convert to lowercase
      .replace('_', ' '); // Replace underscore with space
}

function generateCypherStatementForFacts(entities) { 
  const flattened = Object.values(entities).flat();
  const where = flattened.map(name => `subject.name = '${name}'`).join(" or ");
  const cypherStatement = `
    MATCH (subject)-[r]-(object)
    WHERE ${where}
    RETURN subject.name, type(r), object.name
  `;

  return cypherStatement;
}

export async function updateGraphDB(entities, relationships) {
  const query = generateCypherStatementsForTriples(entities, relationships);
  console.log("Generated Cypher statements:", query);
  
  if (!query) {
    console.log("No Cypher statements generated.");
    return;
  }
  // Execute the Cypher statements
  try {
    console.log("Executing Cypher statement:", query);
    const result = await driver.executeQuery(query);
    console.log("Result:",result);
  } catch (error) {
    console.error("Error executing Cypher statement:", error);
  };

  console.log("Graph database updated successfully!");
}

export async function getFacts(entities) {
  const facts = [];
  const query = generateCypherStatementForFacts(entities);
  let result = { records: [] };

  if (!query)
    return facts;

  try {
    console.log("Executing Cypher statement:", query);
    result = await driver.executeQuery(query);
    console.log("Result:",result);
  } catch (error) {
    console.error("Error executing Cypher statement:", error);
  }

  result.records.forEach(record => {
    const subject = record._fields[0];
    const relationship = formatRelationship(record._fields[1]);
    const object = record._fields[2];
    facts.push(`${subject} ${relationship} ${object}`);
  }); 

  console.log("Facts extracted:", facts);
  return facts;
}
