// Seeded with "My name is Jon.  I'm a software architect at Fleming AI which is in Bothell. I drive a Tesla."

// Occupation
MERGE (Jon_Fleming:Person {name: 'Jon Fleming'})
MERGE (software_architect:Occupation {name: 'software architect'})
MERGE (Jon_Fleming)-[:IS]->(software_architect)
ON CREATE SET 
Jon_Fleming.created = timestamp(),
Jon_Fleming.user =  'Jon Fleming',
Jon_Fleming.session =  'a9a17aa7-357b-4a29-8c0e-45e1882bc63d',
Jon_Fleming.topic =  'Jon: Software Architect at Fleming AI';

// Organization
MERGE (Jon_Fleming:Person {name: 'Jon Fleming'})
MERGE (Fleming_AI:Organization {name: 'Fleming AI'})
MERGE (Jon_Fleming)-[:WORKS_AT]->(Fleming_AI)
ON CREATE SET 
Jon_Fleming.created = timestamp(),
Jon_Fleming.user =  'Jon Fleming',
Jon_Fleming.session =  'a9a17aa7-357b-4a29-8c0e-45e1882bc63d',
Jon_Fleming.topic =  'Jon: Software Architect at Fleming AI';

// Place
MERGE (Fleming_AI:Organization {name: 'Fleming AI'})
MERGE (Bothell:Place {name: 'Bothell'})
MERGE (Fleming_AI)-[:IS_IN]->(Bothell)
ON CREATE SET 
Fleming_AI.created = timestamp(),
Fleming_AI.user =  'Jon Fleming',
Fleming_AI.session =  'a9a17aa7-357b-4a29-8c0e-45e1882bc63d',
Fleming_AI.topic =  'Jon: Software Architect at Fleming AI';

// Product
MERGE (Jon_Fleming:Person {name: 'Jon Fleming'})
MERGE (Tesla:Product {name: 'Tesla'})
MERGE (Jon_Fleming)-[:DRIVES]->(Tesla)
ON CREATE SET 
Jon_Fleming.created = timestamp(),
Jon_Fleming.user =  'Jon Fleming',
Jon_Fleming.session =  'a9a17aa7-357b-4a29-8c0e-45e1882bc63d',
Jon_Fleming.topic =  'Jon: Software Architect at Fleming AI';
