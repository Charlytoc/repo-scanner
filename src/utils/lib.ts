import axios from "axios";

export const debounce = (func: Function, wait: number) => {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
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
