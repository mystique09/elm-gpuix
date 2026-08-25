declare module "*.elm" {
  export const Elm: {
    Main: import("elm-gpuix").ElmProgram<object>;
  };
}
