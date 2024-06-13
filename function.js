import { openai } from "./openai.js";
// method to call to teach GPT how to do advanced math
import math from "advanced-calculator";

const QUESTION = process.argv[2] || "hi";

const messages = [
  {
    role: "user",
    content: QUESTION,
  },
];

// object that acts like a router for our functions - map functions
const functions = {
  // we will give GPT a schema on how to pass an argument to this function if it wants to call it
  // you will tell GPT that when it calls the calculate function
  // it must pass an object with a property on it called expression of string type
  calculate({ expression }) {
    // takes a mathematical expression as a string and then evaluates it
    math.evaluate(expression);
  },
};

const getCompletions = (messages) => {
  return openai.chat.completions.create({
    model: "gpt-4o",
    // is the model equiped with function calling
    messages,
    temperature: 0,
    // array of fn that represents a schema in which there is a function that GPT can call
    tools: [
      {
        type: "function",
        function: {
          name: "calculate",
          description: "Run a math expression",
          parameters: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description:
                  "The math expression to evaluate like '2 * 3 + (21 / 2) ^ 2'",
              },
            },
            required: ["expression"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });
};

let response;
while (true) {
  response = await getCompletions(messages);
  const finishReason = response.choices[0].finish_reason;
  const responseMessage = response.choices[0].message;
  // you know GPT is done when the "finish_reason" property on response.choices[0] equals "stop"
  if (finishReason === "stop") {
    console.log(responseMessage.content);
    break;
  } else if (finishReason === "tool_calls") {
    // extend conversation with assistant's reply
    messages.push(responseMessage);

    const toolCalls = responseMessage.tool_calls;
    for (const toolCall of toolCalls) {
      const fnName = toolCall.function.name;

      const fnToCall = functions[fnName];
      const fnArgs = JSON.parse(toolCall.function.arguments);

      const result = fnToCall(fnArgs);

      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: fnName,
        content: JSON.stringify({ result }),
      });
    }
  }
}
