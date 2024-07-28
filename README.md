# langchainjs-rag-example

This app demonstrates the capability of LangchainJS to retrieve information from one document containing user information or any other information you would like to provide.

# Usage

- Place a file in your desired directory containing the information you would like the model to have access to
- Create a .env file in the project's root directory and edit it to have the following variables inside with their corresponding values:
    - ```FILE_LOC_NAME=<The entire directory with the filename>```
    - ```OPENAI_API_KEY=<The OpenAI API key you created for your account in the OpenAI site>```
    - ```CHAT_QUESTION=<The question you would like the model to answer based on the document you provided>```
- Run ```npm install``` from the root of the project
- The command, then, to run the app is as follows:
    ```npx env-cmd ts-node .\src\gpt-service.ts```
