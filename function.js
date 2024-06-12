import { openai } from "./openai.js";
// teach GPT how to do advanced math
import math from "advanced-calculator";
// takes a mathematical expression as a string and then it evaluates it
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
    // functions: [
    //   {
    //     name: "calculate",
    //     // description for GPT to know when to run this function
    //     description: "Run a math expression",
    //     // describes GPT which arguments to pass to the function
    //     parameters: {
    //       type: "object",
    //       properties: {
    //         expression: {
    //           type: "string",
    //           description:
    //             "The math expression to evaluate like '2 * 3 + (21 / 2) ^ 2'",
    //         },
    //       },
    //       // tells GPT that the expression property is required when calling this fn
    //       required: ["expression"],
    //     },
    //   },
    // ],
    // force GPT to call this function no matter what prompt it gets (e.g. "hi")
    // function_call: { name: "calculate" },
  });
};

let response;
while (true) {
  response = await getCompletions(messages);

  // you know GPT is done when the "finish_reason" property on response.choices[0] equals "stop"
  if (response.choices[0].finish_reason === "stop") {
    console.log(response.choices[0].message.content);
    break;
  } else if (response.choices[0].finish_reason === "function_call") {
    const fnName = response.choices[0].message.function_call.name;
    const args = response.choices[0].message.function_call.arguments;

    const functionToCall = functions[fnName];
    const params = JSON.parse(args);

    const result = functionToCall(params);

    messages.push({
      role: "assistant",
      content: null,
      function_call: {
        name: fnName,
        arguments: args,
      },
    });

    messages.push({
      role: "function",
      name: fnName,
      content: JSON.stringify({ result }),
    });
  }
}
