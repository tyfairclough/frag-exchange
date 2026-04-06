declare module "zxcvbn" {
  interface ZXCVBNFeedback {
    warning: string;
    suggestions: string[];
  }

  interface ZXCVBNResult {
    password: string;
    score: number;
    feedback: ZXCVBNFeedback;
    guesses: number;
    guesses_log10: number;
    calc_time: number;
  }

  function zxcvbn(password: string, user_inputs?: string[]): ZXCVBNResult;
  export default zxcvbn;
}
