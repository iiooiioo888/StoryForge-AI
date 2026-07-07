const express = require('express');
const { authMiddleware } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    router.use(authMiddleware);

    // ===== Node type definitions =====
    const NODE_TYPES = {
        'world-anchor': {
            label: 'World Anchor',
            description: 'Define the base world DNA with physics and lighting settings',
            inputs: [],
            outputs: ['worldDNA'],
            defaultParams: {
                physics: 'realistic',
                lighting: 'natural',
                atmosphere: 'standard',
                gravity: 9.81,
                timeOfDay: 'golden-hour',
            },
        },
        'scene-composer': {
            label: 'Scene Composer',
            description: 'Compose scene layout, weather, and environment details',
            inputs: ['worldDNA'],
            outputs: ['sceneBlueprint'],
            defaultParams: {
                layout: 'open-field',
                weather: 'clear',
                density: 'medium',
                mood: 'neutral',
                environment: 'outdoor',
            },
        },
        'cinematic-camera': {
            label: 'Cinematic Camera',
            description: 'Configure camera movement, angle, lens, and framing',
            inputs: ['sceneBlueprint'],
            outputs: ['cameraData'],
            defaultParams: {
                movement: 'dolly-in',
                angle: 'eye-level',
                lens: '50mm',
                aperture: 'f/2.8',
                speed: 'normal',
                stabilization: 'gimbal',
                framing: 'medium-shot',
            },
        },
        'performance-director': {
            label: 'Performance Director',
            description: 'Direct character performances and create a timeline',
            inputs: ['sceneBlueprint'],
            outputs: ['performanceData'],
            defaultParams: {
                characters: [],
                emotions: 'neutral',
                pacing: 'moderate',
                dialogueIntensity: 'medium',
                actionLevel: 'low',
                timelineDuration: 30,
            },
        },
        'match-cut': {
            label: 'Match Cut Editor',
            description: 'Create seamless match cuts and edit sequences',
            inputs: ['cameraData', 'performanceData'],
            outputs: ['editSequence'],
            defaultParams: {
                transitionType: 'match-cut',
                cutRhythm: 'steady',
                crossDissolve: false,
                continuityMode: 'visual',
                maxCuts: 10,
            },
        },
        'cine-sync': {
            label: 'Cine-Sync Audio',
            description: 'Synchronize audio design including music, SFX, and ambient sound',
            inputs: ['editSequence', 'performanceData'],
            outputs: ['audioData'],
            defaultParams: {
                musicMood: 'dramatic',
                sfxIntensity: 'medium',
                ambientLevel: 'low',
                dialogueMix: 'clear',
                spatialAudio: true,
                format: 'stereo',
            },
        },
    };

    // ===== Simulate node execution based on type =====
    function simulateNodeExecution(type, params, inputs) {
        const mergedParams = { ...(NODE_TYPES[type]?.defaultParams || {}), ...params };

        switch (type) {
            case 'world-anchor':
                return {
                    worldDNA: {
                        physics: mergedParams.physics,
                        lighting: mergedParams.lighting,
                        atmosphere: mergedParams.atmosphere,
                        gravity: mergedParams.gravity,
                        timeOfDay: mergedParams.timeOfDay,
                        seed: Math.random().toString(36).substring(2, 10),
                        generatedAt: new Date().toISOString(),
                    },
                };

            case 'scene-composer': {
                const worldDNA = inputs?.worldDNA || {};
                return {
                    sceneBlueprint: {
                        layout: mergedParams.layout,
                        weather: mergedParams.weather,
                        density: mergedParams.density,
                        mood: mergedParams.mood,
                        environment: mergedParams.environment,
                        lightingOverride: worldDNA.lighting || 'natural',
                        physicsRef: worldDNA.physics || 'realistic',
                        elements: [],
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            case 'cinematic-camera': {
                const sceneBlueprint = inputs?.sceneBlueprint || {};
                return {
                    cameraData: {
                        movement: mergedParams.movement,
                        angle: mergedParams.angle,
                        lens: mergedParams.lens,
                        aperture: mergedParams.aperture,
                        speed: mergedParams.speed,
                        stabilization: mergedParams.stabilization,
                        framing: mergedParams.framing,
                        sceneRef: sceneBlueprint.layout || 'default',
                        keyframes: [
                            { time: 0, position: { x: 0, y: 1.5, z: -3 }, rotation: { pitch: 0, yaw: 0 } },
                            { time: 5, position: { x: 0, y: 1.5, z: -1 }, rotation: { pitch: -5, yaw: 0 } },
                        ],
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            case 'performance-director': {
                const sceneBlueprint = inputs?.sceneBlueprint || {};
                return {
                    performanceData: {
                        characters: mergedParams.characters || [],
                        emotions: mergedParams.emotions,
                        pacing: mergedParams.pacing,
                        dialogueIntensity: mergedParams.dialogueIntensity,
                        actionLevel: mergedParams.actionLevel,
                        timeline: Array.from({ length: Math.min(mergedParams.timelineDuration || 10, 5) }, (_, i) => ({
                            time: i * 5,
                            action: 'idle',
                            emotion: mergedParams.emotions,
                            dialogue: null,
                        })),
                        sceneRef: sceneBlueprint.layout || 'default',
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            case 'match-cut': {
                const cameraData = inputs?.cameraData || {};
                const performanceData = inputs?.performanceData || {};
                const numCuts = Math.min(mergedParams.maxCuts || 5, 5);
                return {
                    editSequence: {
                        transitionType: mergedParams.transitionType,
                        cutRhythm: mergedParams.cutRhythm,
                        crossDissolve: mergedParams.crossDissolve,
                        continuityMode: mergedParams.continuityMode,
                        cuts: Array.from({ length: numCuts }, (_, i) => ({
                            id: `cut-${i + 1}`,
                            fromTime: i * 3,
                            toTime: i * 3 + 1.5,
                            type: mergedParams.transitionType,
                            cameraRef: cameraData.framing || 'medium-shot',
                        })),
                        cameraRef: cameraData,
                        performanceRef: performanceData,
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            case 'cine-sync': {
                const editSequence = inputs?.editSequence || {};
                const performanceData = inputs?.performanceData || {};
                return {
                    audioData: {
                        musicMood: mergedParams.musicMood,
                        sfxIntensity: mergedParams.sfxIntensity,
                        ambientLevel: mergedParams.ambientLevel,
                        dialogueMix: mergedParams.dialogueMix,
                        spatialAudio: mergedParams.spatialAudio,
                        format: mergedParams.format,
                        tracks: [
                            { name: 'music', type: 'music', mood: mergedParams.musicMood, volume: 0.6 },
                            { name: 'sfx', type: 'sfx', intensity: mergedParams.sfxIntensity, volume: 0.4 },
                            { name: 'ambient', type: 'ambient', level: mergedParams.ambientLevel, volume: 0.3 },
                            { name: 'dialogue', type: 'dialogue', mix: mergedParams.dialogueMix, volume: 0.8 },
                        ],
                        editRef: editSequence,
                        performanceRef: performanceData,
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            default:
                return { error: `Unknown node type: ${type}` };
        }
    }

    // ===== Topological sort for workflow nodes =====
    function topologicalSort(nodes, connections) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const inDegree = new Map();
        const adjacency = new Map();

        for (const node of nodes) {
            inDegree.set(node.id, 0);
            adjacency.set(node.id, []);
        }

        for (const conn of connections) {
            if (adjacency.has(conn.fromNode)) {
                adjacency.get(conn.fromNode).push(conn.toNode);
            }
            if (inDegree.has(conn.toNode)) {
                inDegree.set(conn.toNode, (inDegree.get(conn.toNode) || 0) + 1);
            }
        }

        const queue = [];
        for (const [nodeId, deg] of inDegree) {
            if (deg === 0) queue.push(nodeId);
        }

        const sorted = [];
        while (queue.length > 0) {
            const current = queue.shift();
            sorted.push(nodeMap.get(current));
            for (const neighbor of (adjacency.get(current) || [])) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        return sorted;
    }

    // ===== GET / — List user's workflows =====
    router.get('/', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = parseInt(req.query.offset) || 0;

            const [workflows, total] = await Promise.all([
                models.Workflow.find({ userId: req.user.id })
                    .sort({ updatedAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .select('-executionLog'),
                models.Workflow.countDocuments({ userId: req.user.id }),
            ]);

            res.json({ workflows, total, limit, offset });
        } catch (err) {
            res.status(500).json({ error: 'Failed to list workflows', details: err.message });
        }
    });

    // ===== POST / — Create new workflow =====
    router.post('/', async (req, res) => {
        try {
            const { name, description, nodes, connections, tags, isPublic } = req.body;
            const workflow = await models.Workflow.create({
                userId: req.user.id,
                name: name || 'Untitled Workflow',
                description: description || '',
                nodes: nodes || [],
                connections: connections || [],
                tags: tags || [],
                isPublic: isPublic || false,
            });
            res.status(201).json({ workflow });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create workflow', details: err.message });
        }
    });

    // ===== GET /node-types — Return available node types =====
    router.get('/node-types', (req, res) => {
        res.json({ nodeTypes: NODE_TYPES });
    });

    // ===== GET /:id — Get single workflow =====
    router.get('/:id', async (req, res) => {
        try {
            const workflow = await models.Workflow.findOne({
                _id: req.params.id,
                userId: req.user.id,
            });
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
            res.json({ workflow });
        } catch (err) {
            res.status(500).json({ error: 'Failed to get workflow', details: err.message });
        }
    });

    // ===== PUT /:id — Update workflow =====
    router.put('/:id', async (req, res) => {
        try {
            const { name, description, nodes, connections, tags, isPublic, status } = req.body;
            const update = {};
            if (name !== undefined) update.name = name;
            if (description !== undefined) update.description = description;
            if (nodes !== undefined) update.nodes = nodes;
            if (connections !== undefined) update.connections = connections;
            if (tags !== undefined) update.tags = tags;
            if (isPublic !== undefined) update.isPublic = isPublic;
            if (status !== undefined) update.status = status;

            const workflow = await models.Workflow.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                update,
                { new: true }
            );
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
            res.json({ workflow });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update workflow', details: err.message });
        }
    });

    // ===== DELETE /:id — Delete workflow =====
    router.delete('/:id', async (req, res) => {
        try {
            const workflow = await models.Workflow.findOneAndDelete({
                _id: req.params.id,
                userId: req.user.id,
            });
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
            res.json({ message: 'Workflow deleted', id: req.params.id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete workflow', details: err.message });
        }
    });

    // ===== POST /:id/execute — Execute entire workflow =====
    router.post('/:id/execute', async (req, res) => {
        try {
            const workflow = await models.Workflow.findOne({
                _id: req.params.id,
                userId: req.user.id,
            });
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

            // Set status to running
            workflow.status = 'running';
            const executionLog = [];
            const nodeOutputs = {};

            try {
                // Topological sort
                const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);

                if (sortedNodes.length === 0 && workflow.nodes.length > 0) {
                    throw new Error('Cycle detected in workflow graph');
                }

                for (const node of sortedNodes) {
                    const startedAt = new Date();

                    try {
                        // Gather inputs from connected nodes
                        const inputs = {};
                        for (const conn of workflow.connections) {
                            if (conn.toNode === node.id && nodeOutputs[conn.fromNode]) {
                                inputs[conn.fromInput] = nodeOutputs[conn.fromNode][conn.fromOutput];
                            }
                        }

                        // Execute node
                        const output = simulateNodeExecution(node.type, node.params || {}, inputs);
                        nodeOutputs[node.id] = output;

                        // Update node execState
                        const nodeInWorkflow = workflow.nodes.id(node._id) || workflow.nodes.find(n => n.id === node.id);
                        if (nodeInWorkflow) {
                            nodeInWorkflow.execState = 'completed';
                            nodeInWorkflow.outputData = output;
                        }

                        executionLog.push({
                            nodeId: node.id,
                            status: 'completed',
                            output,
                            startedAt,
                            completedAt: new Date(),
                        });
                    } catch (nodeErr) {
                        const nodeInWorkflow = workflow.nodes.id(node._id) || workflow.nodes.find(n => n.id === node.id);
                        if (nodeInWorkflow) {
                            nodeInWorkflow.execState = 'failed';
                        }

                        executionLog.push({
                            nodeId: node.id,
                            status: 'failed',
                            error: nodeErr.message,
                            startedAt,
                            completedAt: new Date(),
                        });

                        throw nodeErr;
                    }
                }

                workflow.status = 'completed';
                workflow.lastExecutedAt = new Date();
            } catch (execErr) {
                workflow.status = 'failed';
            }

            workflow.executionLog = executionLog;
            await workflow.save();

            res.json({
                workflow,
                executionLog,
                status: workflow.status,
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to execute workflow', details: err.message });
        }
    });

    // ===== POST /execute-node — Execute a single node =====
    router.post('/execute-node', async (req, res) => {
        try {
            const { type, params, inputs } = req.body;

            if (!type) return res.status(400).json({ error: 'Node type is required' });
            if (!NODE_TYPES[type]) return res.status(400).json({ error: `Unknown node type: ${type}` });

            const startedAt = new Date();
            const output = simulateNodeExecution(type, params || {}, inputs || {});
            const completedAt = new Date();

            res.json({
                type,
                output,
                executionTime: completedAt - startedAt,
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to execute node', details: err.message });
        }
    });

    // ===== POST /:id/duplicate — Duplicate a workflow =====
    router.post('/:id/duplicate', async (req, res) => {
        try {
            const original = await models.Workflow.findOne({
                _id: req.params.id,
                userId: req.user.id,
            });
            if (!original) return res.status(404).json({ error: 'Workflow not found' });

            const duplicate = await models.Workflow.create({
                userId: req.user.id,
                name: `${original.name} (Copy)`,
                description: original.description,
                nodes: original.nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    params: n.params,
                })),
                connections: original.connections.map(c => ({
                    id: c.id,
                    fromNode: c.fromNode,
                    fromOutput: c.fromOutput,
                    toNode: c.toNode,
                    toInput: c.toInput,
                })),
                tags: [...original.tags],
                isPublic: false,
                status: 'draft',
            });

            res.status(201).json({ workflow: duplicate });
        } catch (err) {
            res.status(500).json({ error: 'Failed to duplicate workflow', details: err.message });
        }
    });

    return router;
};
