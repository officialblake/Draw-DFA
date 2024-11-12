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
    const [acceptingStates, setAcceptingStates] = useState(new Set());

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

    const toggleAcceptingState = (stateId) => {
        setAcceptingStates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stateId)) {
                newSet.delete(stateId);
                // Update visual appearance to non-accepting state
                const state = states.find(s => s.id === stateId);
                if (state) {
                    state.node.attr('body/fill', '#ccccff');
                }
            } else {
                newSet.add(stateId);
                // Update visual appearance to accepting state
                const state = states.find(s => s.id === stateId);
                if (state) {
                    state.node.attr('body/fill', '#90EE90');
                }
            }
            return newSet;
        });
    };

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

        const existingLink = graph.getLinks().find(link => {
            const sourceId = link.getSourceElement().id;
            const targetId = link.getTargetElement().id;
            return sourceId === sourceState.id && targetId === targetState.id;
        });

        if (existingLink) {
            const existingLabel = existingLink.labels()[0].attrs.text.text;
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

        setTransitions([...transitions, { 
            sourceId: sourceState.id, 
            source: sourceState.label, 
            targetId: targetState.id, 
            target: targetState.label, 
            label: transitionLabel 
        }]);
        setIsAddingTransition(false);
    };

    const saveMachine = () => {
        const machineData = {
            states: states.map(state => ({
                label: state.label,
                id: state.id,
                x: state.node.position().x,
                y: state.node.position().y,
                isAccepting: acceptingStates.has(state.id)
            })),
            transitions: transitions.map(transition => ({
                sourceId: transition.sourceId,
                targetId: transition.targetId,
                label: transition.label,
                source: transition.source,
                target: transition.target
            }))
        };
    
        const blob = new Blob([JSON.stringify(machineData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'dfa_nfa_machine.json';
        link.click();
    };

    const loadMachine = (event) => {
        const file = event.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            graph.clear();
            setStates([]);
            setTransitions([]);
            setStateCounter(0);
            setAcceptingStates(new Set());
    
            const stateMap = {};
            const newAcceptingStates = new Set();
    
            data.states.forEach(state => {
                const circle = new shapes.standard.Circle({
                    id: state.id  // Set the ID explicitly
                }); 
                circle.position(state.x, state.y);
                circle.resize(60, 60);
                circle.attr({
                    body: { 
                        fill: state.isAccepting ? '#90EE90' : '#ccccff', 
                        strokeWidth: 3 
                    },
                    label: { text: state.label, fill: 'black', fontWeight: 'bold' },
                });
                circle.addTo(graph);
                
                stateMap[state.id] = circle.id;
                if (state.isAccepting) {
                    newAcceptingStates.add(circle.id);
                }
                
                setStates(prevStates => [
                    ...prevStates,
                    { id: circle.id, label: state.label, node: circle }
                ]);
                setStateCounter(prevCounter => prevCounter + 1);
            });
    
            setAcceptingStates(newAcceptingStates);
    
            data.transitions.forEach(transition => {
                const sourceStateId = stateMap[transition.sourceId];
                const targetStateId = stateMap[transition.targetId];
    
                if (sourceStateId && targetStateId) {
                    const existingLink = graph.getLinks().find(link => {
                        const sourceId = link.getSourceElement().id;
                        const targetId = link.getTargetElement().id;
                        return sourceId === sourceStateId && targetId === targetStateId;
                    });
    
                    if (existingLink) {
                        const existingLabel = existingLink.labels()[0].attrs.text.text;
                        existingLink.labels([{
                            attrs: { text: { text: `${existingLabel}, ${transition.label}`, fontSize: 14, fontWeight: 'bold' } },
                            position: 0.5,
                        }]);
                    } else {
                        const link = new shapes.standard.Link();
                        link.source({ id: sourceStateId });
                        link.target({ id: targetStateId });
    
                        if (sourceStateId === targetStateId) {
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
                            attrs: { text: { text: transition.label, fontSize: 14, fontWeight: 'bold' } },
                            position: 0.5,
                        }]);
    
                        link.addTo(graph);
                    }
    
                    setTransitions(prevTransitions => [
                        ...prevTransitions,
                        { 
                            sourceId: transition.sourceId, 
                            targetId: transition.targetId, 
                            label: transition.label, 
                            source: transition.source, 
                            target: transition.target 
                        }
                    ]);
                }
            });
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '1000px'}}>
            <div>
                <div>
                    <button onClick={addState} className="button">Add State</button>
                    <button onClick={startAddingTransition} disabled={isAddingTransition} className="button">Add Transition</button>
                    <button onClick={saveMachine} className="button">Save Machine</button>
                    <input type="file" onChange={loadMachine} accept=".json" style={{ display: 'none' }} id="fileInput"/>
                    <button onClick={() => document.getElementById('fileInput').click()} className="button">
                        Load Machine
                    </button>

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

            <div style={{ marginLeft: '20px' }}>
                <h3 style={{ color: 'black' }}>All States</h3>
                <div style={{ marginBottom: '20px' }}>
                    {states.map(state => (
                        <div key={state.id} style={{ marginBottom: '5px' }}>
                            <label style={{ color: 'black' }}>
                                <input
                                    type="checkbox"
                                    checked={acceptingStates.has(state.id)}
                                    onChange={() => toggleAcceptingState(state.id)}
                                />
                                {state.label} (Toggle Accepting State)
                            </label>
                        </div>
                    ))}
                </div>

                <h3 style={{ color: 'black' }}>All Transitions</h3>
                <ul>
                    {transitions.map((t, index) => (
                        <li key={index} style={{ color: 'black' }}>{`${t.source} --${t.label}--> ${t.target}`}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default DfaNfaVisualizer;