import axios from "axios";

export const debounce = (func: Function, wait: number) => {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const generateDescription = async (body: string) => {
  //   const response = await fetch(
  //     "https://api.openai.com/v1/engines/davinci-codex/completions",
  //     {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //       },
  //       body: JSON.stringify({
  //         prompt: `Generate a description for the following markdown content: ${body}`,
  //         max_tokens: 100,
  //       }),
  //     }
  //   );
  return "test";
};

const RIGOBOT_HOST = "https://rigobot.herokuapp.com";
export const generateAIDescription = async (
  rigotoken: string,
  inputs: object
) => {
  const response = await axios.post(
    `${RIGOBOT_HOST}/v1/prompting/completion/258/`,
    {
      inputs: inputs,
      include_purpose_objective: false,
      execute_async: false,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + rigotoken,
      },
    }
  );

  return response.data;
};
