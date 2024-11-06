import React, { useState, useEffect, useRef } from 'react';
import { dia, shapes } from 'jointjs';

const DfaNfaVisualizer = () => {
    const paperRef = useRef(null);
    const [graph, setGraph] = useState(null);
    const [stateCounter, setStateCounter] = useState(0);
    const [states, setStates] = useState([]);
    const [transitions, setTransitions] = useState([]);
    const [isAddingTransition, setIsAddingTransition] = useState(false);
    const [transitionSource, setTransitionSource] = useState(null);
    const [transitionTarget, setTransitionTarget] = useState(null);
    const [transitionLabel, setTransitionLabel] = useState('');

    useEffect(() => {
        const newGraph = new dia.Graph({}, { cellNamespace: shapes });
        const paper = new dia.Paper({
            el: paperRef.current,
            width: 600,
            height: 600,
            model: newGraph,
            cellViewNamespace: shapes,
            gridSize: 10,
            drawGrid: true,
        });

        setGraph(newGraph);
    }, []);

    const addState = () => {
        if (!graph) return;

        const label = `q${stateCounter}`;
        const x = 100 + (stateCounter % 5) * 100;
        const y = 100 + Math.floor(stateCounter / 5) * 100;

        const circle = new shapes.standard.Circle();
        circle.position(x, y);
        circle.resize(60, 60);
        circle.attr({
            body: { fill: '#ccccff', strokeWidth: 3 },
            label: { text: label, fill: 'black', fontWeight: 'bold' },
        });
        circle.addTo(graph);

        setStates([...states, { id: circle.id, label, node: circle }]);
        setStateCounter(stateCounter + 1);
    };

    const startAddingTransition = () => {
        setIsAddingTransition(true);
        setTransitionSource(null);
        setTransitionTarget(null);
        setTransitionLabel('');
    };

    const confirmTransition = () => {
        if (!graph || !transitionSource || !transitionTarget || !transitionLabel) return;

        const sourceState = states.find(state => state.id === transitionSource);
        const targetState = states.find(state => state.id === transitionTarget);

        // Check for an existing link
        const existingLink = graph.getLinks().find(link => {
            const sourceId = link.getSourceElement().id;
            const targetId = link.getTargetElement().id;
            return sourceId === sourceState.id && targetId === targetState.id;
        });

        if (existingLink) {
            const existingLabel = existingLink.labels().at(0).attrs.text.text;
            existingLink.labels([{
                attrs: { text: { text: `${existingLabel}, ${transitionLabel}`, fontSize: 14, fontWeight: 'bold' } },
                position: 0.5,
            }]);
        } else {
            const link = new shapes.standard.Link();
            link.source({ id: sourceState.id });
            link.target({ id: targetState.id });

            if (transitionSource === transitionTarget) {
                link.router({
                    name: 'manhattan',
                    args: {
                        padding: 20,
                        startDirections: ['top'],
                        endDirections: ['bottom'],
                    },
                });
                link.connector('rounded');
            } else {
                link.router({
                    name: 'manhattan',
                    args: {
                        padding: 20,
                        startDirections: ['top', 'left', 'bottom', 'right'],
                        endDirections: ['top', 'left', 'bottom', 'right'],
                    },
                });
            }

            link.attr({
                line: {
                    stroke: 'black',
                    strokeWidth: 2,
                    targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: 'black' },
                },
            });
            link.labels([{
                attrs: { text: { text: transitionLabel, fontSize: 14, fontWeight: 'bold' } },
                position: 0.5,
            }]);
            link.addTo(graph);
        }

        setTransitions([...transitions, { sourceId: sourceState.id, source: sourceState.label, targetId: targetState.id, target: targetState.label, label: transitionLabel }]);
        setIsAddingTransition(false);
    };
    let tempTransitions;
    const saveMachine = () => {
        console.log("transitions@@@@ ", transitions);
        const machineData = {
            states: states.map(state => ({
                label: state.label,
                id: state.id,  // Save the state id
                x: state.node.position().x,
                y: state.node.position().y
            })),
            transitions: transitions.map(transition => ({
                sourceId: transition.sourceId,  // Save the source state id
                targetId: transition.targetId,  // Save the target state id
                label: transition.label,
                source: transition.source,
                target: transition.target
            }))
        };
    
        const blob = new Blob([JSON.stringify(machineData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'dfa_nfa_machine.json';
        console.log([JSON.stringify(machineData, null, 2)])
        link.click();
    };
    
    
    

    const loadMachine = (event) => {
        const file = event.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            console.log(data);
            // Clear the existing graph, states, and transitions
            graph.clear();
            setStates([]);
            setTransitions([]);
            setStateCounter(0);
    
            // Create a map of state IDs to make linking easier
            const stateMap = {};
    
            // Recreate states first with positions
            data.states.forEach(state => {
                const circle = new shapes.standard.Circle();
                circle.position(state.x, state.y); 
                circle.resize(60, 60);
                circle.attr({
                    body: { fill: '#ccccff', strokeWidth: 3 },
                    label: { text: state.label, fill: 'black', fontWeight: 'bold' },
                });
                circle.addTo(graph);
                // Save the state in the map for linking later
                stateMap[state.id] = circle.id;
                setStates(prevStates => [
                    ...prevStates,
                    { id: circle.id, label: state.label, node: circle }
                ]);
                setStateCounter(prevCounter => prevCounter + 1);
            });
    
            // Recreate transitions using sourceId and targetId
            data.transitions.forEach(transition => {
                const sourceStateId = stateMap[transition.sourceId];
                const targetStateId = stateMap[transition.targetId];
    
                if (sourceStateId && targetStateId) {
                    const existingLink = graph.getLinks().find(link => {
                        const sourceId = link.getSourceElement().id;
                        const targetId = link.getTargetElement().id;
                        return sourceId === sourceStateId && targetId === targetStateId;
                    });
    
                    // Create a new link if none exists, otherwise update the existing one
                    if (existingLink) {
                        const existingLabel = existingLink.labels().at(0).attrs.text.text;
                        existingLink.labels([{
                            attrs: { text: { text: `${existingLabel}, ${transition.label}`, fontSize: 14, fontWeight: 'bold' } },
                            position: 0.5,
                        }]);
                    } else {
                        const link = new shapes.standard.Link();
                        link.source({ id: sourceStateId });
                        link.target({ id: targetStateId });
    
                        // Handle self-loops by adjusting the router
                        if (sourceStateId === targetStateId) {
                            link.router({
                                name: 'manhattan',
                                args: {
                                    padding: 20,
                                    startDirections: ['top'],
                                    endDirections: ['bottom'],
                                },
                            });
                        } else {
                            link.router({
                                name: 'manhattan',
                                args: {
                                    padding: 20,
                                    startDirections: ['top', 'left', 'bottom', 'right'],
                                    endDirections: ['top', 'left', 'bottom', 'right'],
                                },
                            });
                        }
    
                        link.connector('rounded');
                        link.attr({
                            line: {
                                stroke: 'black',
                                strokeWidth: 2,
                                targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: 'black' },
                            },
                        });
    
                        link.labels([{
                            attrs: { text: { text: transition.label, fontSize: 14, fontWeight: 'bold' } },
                            position: 0.5,
                        }]);
    
                        link.addTo(graph);
                    }
    
                    // Add transition to the list
                    setTransitions(prevTransitions => [
                        ...prevTransitions,
                        { sourceId: transition.sourceId, targetId: transition.targetId, label: transition.label, source: transition.source, target: transition.target }
                    ]);
                }
            });
        };
        reader.readAsText(file);
    };
    
    
    
    

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div>
                <div>
                    <button onClick={addState}>Add State</button>
                    <button onClick={startAddingTransition} disabled={isAddingTransition}>Add Transition</button>
                    <button onClick={saveMachine}>Save Machine</button>
                    <input type="file" onChange={loadMachine} accept=".json" style={{ marginLeft: '10px' }} />

                    {isAddingTransition && (
                        <div style={{ marginTop: '10px' }}>
                            <h4>Adding Transition</h4>
                            <select onChange={(e) => setTransitionSource(e.target.value)} value={transitionSource || ''}>
                                <option value="">Select Source State</option>
                                {states.map(state => (
                                    <option key={state.id} value={state.id}>{state.label}</option>
                                ))}
                            </select>

                            <select onChange={(e) => setTransitionTarget(e.target.value)} value={transitionTarget || ''}>
                                <option value="">Select Target State</option>
                                {states.map(state => (
                                    <option key={state.id} value={state.id}>{state.label}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Transition Character"
                                value={transitionLabel}
                                onChange={(e) => setTransitionLabel(e.target.value)}
                                maxLength="1"
                            />

                            <button
                                onClick={confirmTransition}
                                disabled={!transitionSource || !transitionTarget || !transitionLabel}
                            >
                                Confirm Transition
                            </button>
                        </div>
                    )}
                </div>

                <div ref={paperRef} style={{ width: '600px', height: '600px', border: '1px solid #ccc', marginTop: '20px' }}></div>
            </div>

            <div style={{ marginLeft: '20px', maxWidth: '200px' }}>
                <h3>Transitions</h3>
                <ul>
                    {transitions.map((t, index) => (
                        <li key={index}>{`${t.source} --${t.label}--> ${t.target}`}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default DfaNfaVisualizer;
