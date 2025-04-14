document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const modelSelect = document.getElementById('model-select');
    const currentModelSpan = document.getElementById('current-model');
    const messageCountSpan = document.getElementById('message-count');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const clearChatButton = document.getElementById('clear-chat');
    
    // State
    let messageCount = 0;
    
    // Event listeners
    modelSelect.addEventListener('change', function() {
        currentModelSpan.textContent = this.value;
        addSystemMessage(`Switched to model: ${this.value}`);
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    clearChatButton.addEventListener('click', function() {
        chatMessages.innerHTML = '';
        addSystemMessage('Chat cleared');
        messageCount = 0;
        updateMessageCount();
    });
    
    // Functions
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addUserMessage(message);
        messageInput.value = '';
        
        // Get selected model
        const modelId = modelSelect.value;
        
        // Show typing indicator
        const typingIndicator = addTypingIndicator();
        
        // Call API
        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model_id: modelId,
                message: message
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add bot response
            addBotMessage(data.reply);
        })
        .catch(error => {
            // Remove typing indicator
            typingIndicator.remove();
            
            console.error('Error:', error);
            addSystemMessage('Error: Failed to get response from the model.');
        });
    }
    
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        messageCount++;
        updateMessageCount();
        scrollToBottom();
    }
    
    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        messageCount++;
        updateMessageCount();
        scrollToBottom();
    }
    
    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function addTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'system-message';
        indicatorDiv.textContent = 'Model is thinking...';
        chatMessages.appendChild(indicatorDiv);
        scrollToBottom();
        return indicatorDiv;
    }
    
    function updateMessageCount() {
        messageCountSpan.textContent = messageCount;
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to fetch available models from Ollama
    function fetchAvailableModels() {
        fetch('http://localhost:11434/api/tags')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch models');
                }
                return response.json();
            })
            .then(data => {
                const modelSelect = document.getElementById('model-select');
                modelSelect.innerHTML = ''; // Clear the loading option
                
                if (data.models && data.models.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        
                        // Create a more descriptive label that includes model size if available
                        let displayName = model.name;
                        if (model.details && model.details.parameter_size) {
                            displayName += ` (${model.details.parameter_size})`;
                        }
                        option.textContent = displayName;
                        
                        modelSelect.appendChild(option);
                    });
                    
                    // Update the current model display
                    document.getElementById('current-model').textContent = modelSelect.value;
                    
                    // Trigger change event to ensure any listeners are updated
                    const event = new Event('change');
                    modelSelect.dispatchEvent(event);
                } else {
                    // If no models are available
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No models available';
                    modelSelect.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Error fetching models:', error);
                const modelSelect = document.getElementById('model-select');
                modelSelect.innerHTML = ''; // Clear the loading option
                
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Error loading models';
                modelSelect.appendChild(option);
            });
    }
    
    // Initialize
    currentModelSpan.textContent = modelSelect.value;
    
    // Call fetchAvailableModels to load models when the page initializes
    fetchAvailableModels();
}); 