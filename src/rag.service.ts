import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

@Injectable()
export class RagService {
  async getChain(model: ChatOpenAI, prompt) {
    try {
      console.log("Retrieving file");
      const text = fs.readFileSync(process.env.FILE_LOC_NAME, "utf8");
      console.log("Retrieved text");
      const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 4 });
      const docs = await textSplitter.createDocuments([Buffer.from(text).toString()]);

      if (docs == null) throw new Error(`Docs not retrieved`);

      console.log("Retrieved file");
      docs.forEach((doc) => console.log(doc.pageContent));

      const newDocs = docs.filter((doc) => doc.pageContent);

      const vectorstore = await MemoryVectorStore.fromDocuments(
        newDocs,
        new OpenAIEmbeddings()
      );

      console.log("Before creating stuffDocumentsChain");
      console.log(prompt.promptMessages);
      const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt,
      });
      const retriever = vectorstore.asRetriever();

      console.log("Before creating retrieval chain");
      
      const chain = await createRetrievalChain({
        combineDocsChain,
        retriever,
      });

      return await chain.invoke({
        input: "prompt.promptMessages",
        // context: retriever,
        context: newDocs,
        agent_scratchpad:[]
      });

    } catch (error) {
      console.log("Error in patsing documents: " + error);
      console.error(error);
    }
  }
}