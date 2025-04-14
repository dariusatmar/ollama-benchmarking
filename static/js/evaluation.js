document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const modelSelect = document.getElementById('eval-model-select');
    const benchmarkSelect = document.getElementById('benchmark-select');
    const benchmarkDescription = document.getElementById('benchmark-description');
    const runEvaluationButton = document.getElementById('run-evaluation');
    const resultsStatus = document.getElementById('results-status');
    const resultsContainer = document.getElementById('results-container');
    
    // Load available benchmarks and models
    loadBenchmarks();
    fetchAvailableModels();
    
    // Event listeners
    benchmarkSelect.addEventListener('change', function() {
        updateBenchmarkDescription(this.value);
    });
    
    runEvaluationButton.addEventListener('click', runEvaluation);
    
    // Functions
    function loadBenchmarks() {
        fetch('/benchmarks')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Clear loading option
                benchmarkSelect.innerHTML = '';
                
                // Add benchmarks to select
                Object.keys(data).forEach(benchmarkName => {
                    const option = document.createElement('option');
                    option.value = benchmarkName;
                    option.textContent = benchmarkName;
                    benchmarkSelect.appendChild(option);
                });
                
                // Update description for the first benchmark
                if (benchmarkSelect.options.length > 0) {
                    updateBenchmarkDescription(benchmarkSelect.value);
                }
            })
            .catch(error => {
                console.error('Error loading benchmarks:', error);
                benchmarkSelect.innerHTML = '<option value="">Error loading benchmarks</option>';
                benchmarkDescription.textContent = 'Failed to load benchmarks. Please try refreshing the page.';
            });
    }
    
    function updateBenchmarkDescription(benchmarkName) {
        fetch('/benchmarks')
            .then(response => response.json())
            .then(data => {
                if (data[benchmarkName]) {
                    benchmarkDescription.textContent = data[benchmarkName].description;
                } else {
                    benchmarkDescription.textContent = 'No description available.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                benchmarkDescription.textContent = 'Error loading benchmark description.';
            });
    }
    
    function runEvaluation() {
        const modelId = modelSelect.value;
        const benchmarkName = benchmarkSelect.value;
        
        if (!modelId || !benchmarkName) {
            alert('Please select both a model and a benchmark.');
            return;
        }
        
        // Update status
        resultsStatus.textContent = `Running evaluation of ${modelId} on ${benchmarkName}...`;
        resultsStatus.className = 'results-status running';
        
        // Clear previous results
        resultsContainer.innerHTML = '';
        
        // Disable run button
        runEvaluationButton.disabled = true;
        
        // Call API
        fetch('/run_evaluation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model_id: modelId,
                benchmark_name: benchmarkName
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update status
            resultsStatus.textContent = `Evaluation completed: ${data.status}`;
            resultsStatus.className = 'results-status success';
            
            // Display results
            data.results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                const promptDiv = document.createElement('div');
                promptDiv.className = 'result-prompt';
                promptDiv.textContent = result.prompt;
                
                const responseDiv = document.createElement('div');
                responseDiv.className = 'result-response';
                responseDiv.textContent = result.response;
                
                resultItem.appendChild(promptDiv);
                resultItem.appendChild(responseDiv);
                resultsContainer.appendChild(resultItem);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            resultsStatus.textContent = `Error: ${error.message}`;
            resultsStatus.className = 'results-status error';
        })
        .finally(() => {
            // Re-enable run button
            runEvaluationButton.disabled = false;
        });
    }

    // Function to fetch available models from Ollama
    function fetchAvailableModels() {
        // Use the correct select element ID for the evaluation page
        const evalModelSelect = document.getElementById('eval-model-select');
        evalModelSelect.innerHTML = '<option value="">Loading models...</option>'; // Add loading state

        fetch('http://localhost:11434/api/tags')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch models from Ollama');
                }
                return response.json();
            })
            .then(data => {
                evalModelSelect.innerHTML = ''; // Clear the loading option

                if (data.models && data.models.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;

                        // Create a more descriptive label
                        let displayName = model.name;
                        if (model.details && model.details.parameter_size) {
                            displayName += ` (${model.details.parameter_size})`;
                        }
                        option.textContent = displayName;

                        evalModelSelect.appendChild(option);
                    });
                } else {
                    // If no models are available
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No models available';
                    evalModelSelect.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Error fetching models:', error);
                evalModelSelect.innerHTML = ''; // Clear the loading option

                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Error loading models';
                evalModelSelect.appendChild(option);
            });
    }
});