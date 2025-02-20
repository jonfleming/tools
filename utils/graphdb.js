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

function generateCypherMergeStatement(entities, triple) {
  const { subject, verb, object } = triple;
  const cypherLines = [];

  // 1. Transform the verb to relationship type
  const relationshipType = transformVerbToRelationshipType(verb);

  // 2. Find subject and object in the entities list
  const subjectEntityLabel = getEntityLabel(entities, subject);
  const objectEntityLabel = getEntityLabel(entities, object);

  if (subjectEntityLabel && objectEntityLabel) {
    cypherLines.push(`
      MERGE (subjectNode:${subjectEntityLabel} {name: '${subject}'})
      MERGE (objectNode:${objectEntityLabel} {name: '${object}'})
      MERGE (subjectNode)-[:${relationshipType}]->(objectNode)
    `);
  }

  // 3. Construct the Cypher MERGE statement
  const cypherStatement = cypherLines.join("\n");

  return cypherStatement;
}

function getEntityLabel(entities, entityName) {
  return Object.keys(entities).find(label => entities[label].includes(entityName)) || null;
}

function generateCypherStatementsForTriples(entities, triples) {
  const cypher = triples.map((triple) => generateCypherMergeStatement(entities, triple));
  
  return cypher;
}

export function updateGraphDB(entities, relationships) {
  generateCypherStatementsForTriples(entities, relationships).forEach((cypherStatement) => {
    console.log("Executing Cypher statement:", cypherStatement);
    const { records, summary } = driver.executeQuery(cypherStatement);
    console.log("Result:", records, summary);
  });

  console.log("Graph database updated successfully!");
}
