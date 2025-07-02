require('dotenv').config();
const { WebSocketServer } = require('ws');
const { createGameState, addUser, removeUser, setupMessageHandler, resumeActiveGameForUser, cleanupAllTimeouts } = require('./dist/lib/state-manager');
const { prisma } = require('./dist/lib/prisma');
//FINAL TRY
const wss = new WebSocketServer({ port: process.env.PORT||8081 });
const state = createGameState();

wss.on('connection', (ws) => {
    let authenticated = false;

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data);
            if (!authenticated && msg.type === 'auth' && msg.clerkId) {
                console.log('🔐 Authentication attempt for clerkId:', msg.clerkId);
                try {
                    // Upsert user in DB
                    const user = await prisma.user.upsert({
                        where: { clerkId: msg.clerkId },
                        update: {},
                        create: { clerkId: msg.clerkId }
                    });
                    console.log('✅ User authenticated:', user.id);
                    ws.clerkId = msg.clerkId;
                    ws.userId = user.id;
                    authenticated = true;
                    addUser(state, ws);
                    setupMessageHandler(state, ws);
                    // Resume any active game for this user
                    console.log('🔄 Checking for active games...');
                    try {
                        await resumeActiveGameForUser(state, ws);
                    } catch (error) {
                        console.error('❌ Error in resumeActiveGameForUser:', error);
                        // Fallback: send no_game_to_resume if there's an error
                        ws.send(JSON.stringify({ type: 'no_game_to_resume' }));
                    }
                    console.log('✅ Authentication and game check completed');
                    return;
                } catch (error) {
                    console.error('❌ Authentication error:', error);
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Authentication failed' } }));
                }
            }
            if (!authenticated) {
                // Ignore all other messages until authenticated
                return;
            }
            // If authenticated, let the message handler handle the rest
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    cleanupAllTimeouts();
    
    // Close all WebSocket connections first
    wss.clients.forEach(client => {
        client.close();
    });
    
    // Close the server with a timeout
    wss.close(() => {
        console.log('✅ WebSocket server closed');
        process.exit(0);
    });
    
    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
        console.log('⚠️ Force exiting after timeout');
        process.exit(1);
    }, 5000);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    cleanupAllTimeouts();
    
    // Close all WebSocket connections first
    wss.clients.forEach(client => {
        client.close();
    });
    
    // Close the server with a timeout
    wss.close(() => {
        console.log('✅ WebSocket server closed');
        process.exit(0);
    });
    
    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
        console.log('⚠️ Force exiting after timeout');
        process.exit(1);
    }, 5000);
});

console.log(`✅ WebSocket server started on port ${process.env.PORT || 8081}`); 
