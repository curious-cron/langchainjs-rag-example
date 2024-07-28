import { Injectable } from "@nestjs/common";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, AgentStep } from "langchain/agents";

import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { RagService } from "./rag.service";
import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";


const model = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const ragSchema = z.object({
  query: z.string().describe("The entire query sent by user."),
});

const ragTool = new DynamicStructuredTool({
  name: "query_user_information",
  description: "Send a query to get personal information about the user and their preferences",
  schema: ragSchema,
  func: async ({query}) => {
    console.log(query);
    console.log("Getting information..." + query);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are very powerful assistant. Answer the user's questions by referring to all of your tools and knowledge sources. If you don't know the answer, just say that you don't know, don't try to make up an answer.{context}"],
      ["human", query],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    console.log(prompt.promptMessages);
    const ragService = new RagService();
    const res = await ragService.getChain(model, prompt);

    console.log(res);
    return res.answer;

  }
});

/** Define your list of tools. */
const tools = [ragTool];

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are very powerful assistant. Answer the user's questions by referring to all of your tools and knowledge sources. If you don't know the answer, just say that you don't know, don't try to make up an answer.{context}"],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const modelWithFunctions = model.bind({
  functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});

const runnableAgent = RunnableSequence.from([
  {
    input: (i: { input: string; steps: AgentStep[] }) => i.input,
    agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
      formatToOpenAIFunctionMessages(i.steps),
  },
  prompt,
  modelWithFunctions,
  new OpenAIFunctionsAgentOutputParser(),
]);

const executor = AgentExecutor.fromAgentAndTools({
  agent: runnableAgent,
  tools,
});

const MEMORY_KEY = "chat_history";
const memoryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Answer the user's questions by referring to all of your tools and knowledge sources. 
Don't make something up. If you don't know something, just say "I don't know"`,
  ],
  new MessagesPlaceholder(MEMORY_KEY),
  ["user", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const chatHistory: BaseMessage[] = [];

const agentWithMemory = RunnableSequence.from([
  {
    input: (i) => i.input,
    agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps),
    chat_history: (i) => i.chat_history,
  },
  memoryPrompt,
  modelWithFunctions,
  new OpenAIFunctionsAgentOutputParser(),
]);
/** Pass the runnable along with the tools to create the Agent Executor */
const executorWithMemory = AgentExecutor.fromAgentAndTools({
  agent: agentWithMemory,
  tools,
});

@Injectable()
export class ChatService {

  async chatWithGPT(content: string) {
    console.log(content);
    const result1 = await executorWithMemory.invoke({
      input: content,
      chat_history: chatHistory,
    });
    chatHistory.push(new HumanMessage(content));
    chatHistory.push(new AIMessage(result1.output));
    console.log("Customized chat app: " + result1.output);

    return result1.output;
  }
}

new ChatService().chatWithGPT(process.env.CHAT_QUESTION);