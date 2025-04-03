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

function generateCypherMergeStatement(entities, triple, item, nodes) {
  const { subject, verb, object } = triple;
  const cypherLines = [];

  // 1. Transform the verb to relationship type
  const relationshipType = transformVerbToRelationshipType(verb);

  // 2. Find subject and object in the entities list
  const subjectVar = subject.replace(/\s+/g, "_");
  const objectVar = object.replace(/\s+/g, "_");
  const subjectEntityLabel = getEntityLabel(entities, subject);
  const objectEntityLabel = getEntityLabel(entities, object);

  cypherLines.push(``);
  cypherLines.push(`// ${objectEntityLabel}`);
  
  if (subjectEntityLabel && objectEntityLabel) {
    const entity1 = `${subjectVar}:${subjectEntityLabel} {name: '${subject}'}`;
    const entity2 = `${objectVar}:${objectEntityLabel} {name: '${object}'}`;
    cypherLines.push(`MERGE (${entity1})`);
    if (!nodes.has(subjectVar)) {
      nodes.add(subjectVar);
    }
    cypherLines.push(`MERGE (${entity2})`);
    if (!nodes.has(objectVar)) {
      nodes.add(objectVar);
    }

    if (subjectVar !== objectVar) {
      cypherLines.push(`MERGE (${subjectVar})-[:${relationshipType}]->(${objectVar})`);
    }
  }

  // 3. Add properties to the subject node
  cypherLines.push(`ON CREATE SET `);
  cypherLines.push(`${subjectVar}.created = timestamp(),`)
  cypherLines.push(`${subjectVar}.user =  '${item.user}',`)
  cypherLines.push(`${subjectVar}.session =  '${item.session}',`)
  cypherLines.push(`${subjectVar}.topic =  '${item.topic}'`)
  
  // 4. Construct the Cypher MERGE statement
  const cypherStatement = cypherLines.join("\n");

  return cypherStatement + ';';
  /*  "MERGE (Jon:Person {name: 'Jon'})"
      "MERGE (Jon_Fleming:Person {name: 'Jon Fleming'})"
      'MERGE (Jon)-[:IS]->(Jon_Fleming);'

      "MERGE (software_architect:Occupation {name: 'software architect'})"
      'MERGE (Jon)-[:HAS_OCCUPATION]->(software_architect);'

      "MERGE (Fleming_AI:Organization {name: 'Fleming AI'})"
      'MERGE (Jon)-[:WORKS_AT]->(Fleming_AI);'

      "MERGE (Bothell:Place {name: 'Bothell'})"
      'MERGE (Fleming_AI)-[:LOCATED_IN]->(Bothell);'

      "MERGE (Tesla:Product {name: 'Tesla'})"
      'MERGE (Jon)-[:DRIVES]->(Tesla);'
  */
}

function getEntityLabel(entities, entityName) {
  return Object.keys(entities).find(label => entities[label].includes(entityName)) || null;
}

function generateCypherStatementsForTriples(entities, triples, item) {
  const nodes = new Set(); // To keep track of merged nodes
  const cypher = triples.map((triple) => generateCypherMergeStatement(entities, triple, item, nodes)).join("\n");
  
  return cypher;
}

function formatRelationship(relationship) {
  return relationship
      .toLowerCase()    // Convert to lowercase
      .replace('_', ' '); // Replace underscore with space
}

function generateCypherStatementForFacts(entities) { 
  const flattened = Object.values(entities).flat();
  const where = flattened.map(name => `apoc.text.phonetic(subject.name) = apoc.text.phonetic('${name}')`).join(" or ");
  const cypherStatement = `
    MATCH (subject)-[r]->(object)
    WHERE ${where}
    RETURN subject.name, type(r), object.name
  `;

  return cypherStatement;
}

export async function updateGraphDB(entities, relationships, item) {
  const query = generateCypherStatementsForTriples(entities, relationships, item);
  console.log("Generated Cypher statements:", query);
  
  if (!query) {
    console.log("No Cypher statements generated.");
    return ({ code: 200, message: `No Cypher statements generated for ${item.content}` });
  }
  // Execute the Cypher statements
  try {
    console.log("Executing Cypher statements:", query);
    query.split(';').forEach((q, index) => {
      if (!q.trim()) return; // Skip empty queries
      console.log(`Executing query ${index + 1}:`, q);
      driver.executeQuery(q + ";")
        .then(result => {
          console.log(`Query ${index + 1} executed successfully:`, result);
        })
        .catch(error => {
          console.error(`Error executing query ${index + 1}:`, error);
        });
    });
  } catch (error) {
    console.error("Error executing Cypher statement:", error);
    return ({ code: 500, message: "Error updating graph database" });
  };

  console.log("Graph database updated successfully!");
  return ({ code: 200, message: "Graph database updated successfully" });
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
