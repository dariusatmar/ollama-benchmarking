import weave
from openai import OpenAI
import argparse
import sys

@weave.op()
def call_chat_completion(model_id, prompt, client):
    return client.chat.completions.create(
        messages=[
            {
                'role': 'user',
                'content': prompt,
            }
        ],
        model=model_id,
    )

@weave.op()
def call_completion(model_id, prompt, client):
    return client.completions.create(
        model=model_id,
        prompt=prompt,
    )

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Interact with Ollama models')
    parser.add_argument('--chat', action='store_true', help='Use chat completion mode')
    args = parser.parse_args()

    # Initialize Weave with your project name
    weave.init("ollama-benchmarking")
    
    client = OpenAI(
        base_url='http://localhost:11434/v1/',
        # required but ignored
        api_key='ollama',
    )
    model_id = "cogito:3b"
    
    if args.chat:
        # Chat mode - interactive session
        print(f"Interactive chat mode with {model_id}")
        print("Type your prompts. Type '/exit' to quit.")
        
        while True:
            prompt = input("> ")
            
            if prompt.strip() == "/exit":
                print("Exiting...")
                return
            
            try:
                response = call_chat_completion(model_id, prompt, client)
                print("\nResponse:")
                print(response.choices[0].message.content)
                print()
            except Exception as e:
                print(f"Error: {e}")
    else:
        # Completion mode - single prompt and exit
        print(f"Completion mode with {model_id}")
        print("Type your prompt and press Enter:")
        
        prompt = input("> ")
        
        try:
            response = call_completion(model_id, prompt, client)
            print("\nResponse:")
            print(response.choices[0].text)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()  