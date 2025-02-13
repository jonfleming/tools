import neo4j from 'neo4j-driver';

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('username', 'password')); // Replace with actual credentials

async function createUser(userId, name, email) {
    const session = driver.session();
    try {
        const result = await session.run(
            'CREATE (u:User {user_id: $userId, name: $name, email: $email}) RETURN u',
            { userId, name, email }
        );
        return result.records[0].get('u').properties;
    } finally {
        await session.close();
    }
}

async function createSession(sessionId, startTime, endTime, topic) {
    const session = driver.session();
    try {
        const result = await session.run(
            'CREATE (s:Session {session_id: $sessionId, start_time: $startTime, end_time: $endTime, topic: $topic}) RETURN s',
            { sessionId, startTime, endTime, topic }
        );
        return result.records[0].get('s').properties;
    } finally {
        await session.close();
    }
}

async function addMessage(sessionId, messageId, role, content, timestamp) {
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (s:Session {session_id: $sessionId}) ' +
            'CREATE (m:Message {message_id: $messageId, role: $role, content: $content, timestamp: $timestamp}) ' +
            'CREATE (s)-[:HAS_MESSAGE]->(m) RETURN m',
            { sessionId, messageId, role, content, timestamp }
        );
        return result.records[0].get('m').properties;
    } finally {
        await session.close();
    }
}

async function linkMessages(previousMessageId, currentMessageId) {
    const session = driver.session();
    try {
        await session.run(
            'MATCH (m1:Message {message_id: $previousMessageId}), (m2:Message {message_id: $currentMessageId}) ' +
            'CREATE (m1)-[:NEXT]->(m2)',
            { previousMessageId, currentMessageId }
        );
    } finally {
        await session.close();
    }
}

export { createUser, createSession, addMessage, linkMessages };
