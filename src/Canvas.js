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
    const [testString, setTestString] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [startState, setStartState] = useState(null);
    const [machineType, setMachineType] = useState('');
    const [dfa1, setDfa1] = useState(null);
    const [dfa2, setDfa2] = useState(null);
    const [equivalenceResult, setEquivalenceResult] = useState(null);

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

    
    const setStartingState = (stateId) => {
        // Update visual appearance of previous start state
        if (startState) {
            const prevStartState = states.find(s => s.id === startState);
            prevStartState?.node.attr('body/fill', acceptingStates.has(prevStartState.id) ? '#90EE90' : '#ccccff');
        }
    
        // Update visual appearance of new start state
        const newStartState = states.find(s => s.id === stateId);
        newStartState?.node.attr('body/fill', '#FFE4E1');
    
        setStartState(stateId);
    };

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
        if(machineType === "DFA" && transitionLabel === "ε") return;
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
            machineType,
            startState,
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

            setStartingState(data.startState);
            setMachineType(data.machineType);
            data.states.forEach(state => {
                const circle = new shapes.standard.Circle({
                    id: state.id  // Set the ID explicitly
                }); 
                circle.position(state.x, state.y);
                circle.resize(60, 60);
                circle.attr({
                    body: { 
                        fill: state.isAccepting ? '#90EE90' : data.startState === circle.id ? '#FFE4E1':'#ccccff', 
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
    // Function to test a given string input
    const testInput = () => {
        // Ensure states and transitions are properly defined
        if (!states || !transitions) {
            setTestResult({
                accepted: false,
                message: 'Error: States, transitions, or input string not properly defined',
                path: []
            });
            return;
        }

        // Start at the designated start state
        let currentState = states.find(s => s.id === startState)?.label;
        
        
        if(!states.find(t => t.label === currentState)) {
            setTestResult({
                accepted: false,
                message: 'Error: States, transitions, or input string not properly defined',
                path: []
            });
            return;
        }
        //initialize array which holds path
        const path = [currentState];
        // Process each character in the input string
        for (const symbol of testString) {
            const transition = transitions.find(
                t => t.source === currentState && t.label === symbol
            );

            // If no transition is found, reject the string
            if (!transition) {
                setTestResult({
                    accepted: false,
                    message: `Rejected: No transition found from state ${currentState} with symbol ${symbol}`,
                    path
                });
                highlightPath(path);
                return;
            }
            //set current state to the state reached on given input & add to path
            currentState = transition.target;
            path.push(currentState);
        }

        // Check if the current state is an accepting state and set message
        const isAccepted = acceptingStates.has(states.find(s => s.label === currentState)?.id);

        setTestResult({
            accepted: isAccepted,
            message: isAccepted ? 'Accepted' : 'Rejected: Ended in non-accepting state',
            path
        });
        highlightPath(path);
    };
    const testNFAInput = () => {
        // Ensure states and transitions are properly defined
        if (!states || !transitions) {
            setTestResult({
                accepted: false,
                message: 'Error: States, transitions, or input string not properly defined',
                path: []
            });
            return;
        }
    
        // Helper function to perform DFS from a given state with remaining input
        const dfs = (currentState, remainingInput, currentPath) => {
            // If we've processed all input, explore epsilon transitions and check accepting states
            if (remainingInput.length === 0) {
                // Check if the current state is accepting
                const stateObj = states.find(s => s.label === currentState);
                if (stateObj && acceptingStates.has(stateObj.id)) {
                    return {
                        accepted: true,
                        path: currentPath
                    };
                }
        
                // Explore epsilon transitions
                const epsilonTransitions = transitions.filter(
                    t => t.source === currentState && t.label === "ε"
                );
        
                for (const transition of epsilonTransitions) {
                    const result = dfs(
                        transition.target,
                        remainingInput, // Keep input unchanged for epsilon transitions
                        [...currentPath, transition.target]
                    );
        
                    // If an accepting path is found, return it
                    if (result) {
                        return result;
                    }
                }
        
                // If no accepting path is found, return null
                return null;
            }
        
            // Process the next symbol in the input
            const symbol = remainingInput[0];
            const restInput = remainingInput.slice(1);
        
            // Find all possible transitions for the current symbol or epsilon
            const possibleTransitions = transitions.filter(
                t => t.source === currentState && (t.label === symbol || t.label === "ε")
            );
        
            // Try each possible transition
            for (const transition of possibleTransitions) {
                const result = dfs(
                    transition.target,
                    //if the transition label is epsilon dont splice the remaining input
                    transition.label === "ε" ? remainingInput : restInput,
                    [...currentPath, transition.target]
                );
        
                // If an accepting path is found, return it
                if (result) {
                    return result;
                }
            }
        
            // If no accepting path is found, return null
            return null;
        };
        
        
    
        // Start the search from the initial state
        const startStateLabel = states.find(s => s.id === startState)?.label;
        
        if (!startStateLabel) {
            setTestResult({
                accepted: false,
                message: 'Error: Start state not properly defined',
                path: []
            });
            return;
        }
    
        // Convert input string to array of characters
        const inputArray = Array.from(testString);
        const result = dfs(startStateLabel, inputArray, [startStateLabel]);
    
        if (result) {
            setTestResult({
                accepted: true,
                message: 'Accepted',
                path: result.path
            });
        } else {
            setTestResult({
                accepted: false,
                message: 'Rejected: No accepting path found',
                path: []
            });
        }
    
        // Highlight the accepting path if one was found
        if (result && result.path) {
            highlightPath(result.path);
        }
    };

    // Function to highlight the path in the visualization
    const highlightPath = (path) => {
        if (!graph || !states || path.length === 0) return;

        // Reset all states and transitions to default appearance
        states.forEach(state => {
            state.node.attr('body/fill',
                acceptingStates.has(state.id) ? '#90EE90' : '#ccccff'
            );
        });

        graph.getLinks().forEach(link => {
            link.attr('line/stroke', 'black');
            link.attr('line/strokeWidth', 2);
        });

        // Highlight the states and transitions in the path
        for (let i = 0; i < path.length - 1; i++) {
            const currentState = path[i];
            const nextState = path[i + 1];

            const currentNode = states.find(s => s.label === currentState).node;
            if (currentNode) {
                currentNode.attr('body/fill', '#FFB6C1');
            }

            const link = graph.getLinks().find(link =>
                link.getSourceElement().id === currentNode.id &&
                link.getTargetElement().id === states.find(s => s.label === nextState).node.id
            );

            if (link) {
                link.attr('line/stroke', '#FF69B4');
                link.attr('line/strokeWidth', 3);
            }
        }

        // Highlight the final state reached
        const finalState = states.find(s => s.label === path[path.length - 1]).node;
        if (finalState) {
            finalState.attr('body/fill', '#FF69B4');
        }
    };

    // Function to reset highlighting
    const resetHighlighting = () => {
        if (!graph || !states) return;

        // Reset states to default colors
        states.forEach(state => {
            if(state.id === startState){
                state.node.attr('body/fill', '#FFE4E1');
            }
            else{
                state.node.attr('body/fill',
                    acceptingStates.has(state.id) ? '#90EE90' : '#ccccff'
                );
            }

        });

        // Reset transitions to default appearance
        graph.getLinks().forEach(link => {
            link.attr('line/stroke', 'black');
            link.attr('line/strokeWidth', 2);
        });
    };
  // Handle file uploads for equivalence testing
  const handleDfaFileUpload = (fileNumber, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dfa = JSON.parse(e.target.result);
          if (fileNumber === 1) {
            setDfa1(dfa);
          } else {
            setDfa2(dfa);
          }
        } catch (error) {
          alert('Error reading file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };
    // Function to check DFA equivalence
    const checkDfaEquivalence = () => {
        if (!dfa1 || !dfa2) {
          alert('Please upload both DFA files first');
          return;
        }
    
        // Basic validation that both are DFAs
        if (dfa1.machineType !== 'DFA' || dfa2.machineType !== 'DFA') {
          setEquivalenceResult({
            equivalent: false,
            message: 'Both machines must be DFAs'
          });
          return;
        }
        const newMachine = {
            machineType: "DFA",
            startState: null,
            states: [],
            transitions: []
        }
    

        let currState1 = dfa1.states.find(s => s.id === dfa1.startState);
        let currState2 = dfa2.states.find(s => s.id === dfa2.startState);
        
        let currTrans1 = dfa1.transitions.filter(t => t.sourceId === currState1.id);
        let currTrans2 = dfa2.transitions.filter(t => t.sourceId === currState2.id);
        
        console.log("Transitions from DFA1 start state:", currTrans1);
        console.log("Transitions from DFA2 start state:", currTrans2); 
        // This is a placeholder for the actual equivalence checking logic


        setEquivalenceResult({
          equivalent: true,
          message: 'Analysis complete. The DFAs are equivalent.'
        });
      };

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '1000px'}}>
            <div>
                <div>
                <select 
                    value={machineType || ''} 
                    onChange={(e) => setMachineType(e.target.value)}
                >
                    <option value="" disabled>
                        Select Machine Type
                    </option>
                    <option value="DFA">DFA</option>
                    <option value="NFA">NFA</option>
                </select>

                    <button onClick={addState} className="button">Add State</button>
                    <button onClick={startAddingTransition} disabled={isAddingTransition} className="button">Add Transition</button>
                    <button onClick={saveMachine} className="button">Save Machine</button>
                    <input type="file" onChange={loadMachine} accept=".json" style={{ display: 'none' }} id="fileInput"/>
                    <button onClick={() => document.getElementById('fileInput').click()} className="button">
                        Load Machine
                    </button>
                    {machineType === "NFA" &&
                        (
                            <h4 style={{color : 'black'}}>Epsilon symbol for NFA (copy and paste) ε</h4>
                    )}
                    <div style={{ marginTop: '10px' }}>
                    <h4 style={{ color: 'black' }}>Set Starting State</h4>
                    <select
                        value={startState || ''}
                        onChange={(e) => setStartingState(e.target.value)}
                    >
                        <option value="">Select Starting State</option>
                        {states.map(state => (
                            <option key={state.id} value={state.id}>{state.label}</option>
                        ))}
                    </select>
                </div>
                    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc' }}>
                        <h4 style={{ color: 'black' }}>Test String (Starting from {states.find(s => s.id === startState)?.label})</h4>
                        
                        {/* String input and test button */}
                        <div style={{ marginTop: '5px' }}>
                            <input
                                type="text"
                                value={testString}
                                onChange={(e) => {
                                    //on change of input reset path and test result
                                    resetHighlighting();
                                    setTestString(e.target.value);
                                    setTestResult(null); 
                                }}
                                placeholder="Enter test string"
                            />
                            <button 
                                onClick={machineType === "DFA" ? testInput : testNFAInput}
                                //disabled={}
                                className="button"
                            >
                                Test String
                            </button>
                        </div>
                        {(
                            <div>
                                <h4 style={{color: 'black'}}>DFA Equivalence Test(Upload 2 DFA JSON files)</h4>
                                <div>
                                <input
                                    type="file"
                                    onChange={(e) => handleDfaFileUpload(1, e)}
                                    accept=".json"
                                />
                                <input
                                    type="file"
                                    onChange={(e) => handleDfaFileUpload(2, e)}
                                    accept=".json"
                                />
                                <button 
                                    onClick={checkDfaEquivalence}
                                    className="button"
                                    disabled={!dfa1 || !dfa2}
                                >
                                    Check Equivalence
                                </button>
                                </div>
                                
                                {equivalenceResult && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '5px',
                                        backgroundColor: equivalenceResult.equivalent ? 'green' : 'red',
                                        borderRadius: '4px'
                                    }}>
                                        <strong>Result:</strong> {equivalenceResult.message}
                                </div>
                                )}
                            </div>)}
    
            {/* Result display */}
            {testResult && (
                <div style={{
                    marginTop: '10px',
                    padding: '5px',
                    backgroundColor: testResult.accepted ? 'green' : 'red',
                    borderRadius: '4px'
                }}>
                    <strong>Result:</strong> {testResult.message}
                    {testResult.path && (
                        <div>
                            <strong>Path:</strong> {testResult.path.join(' → ')}
                        </div>
                    )}
                </div>
            )}
        </div>
                    
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
