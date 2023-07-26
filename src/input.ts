import * as readline from "readline";

export default class Input {
  private reader: readline.Interface;
  private buffer: string[] = [];
  private waitingCallback: ((str: string) => void)[] = [];

  constructor() {
    this.reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.reader.on("line", this.onLine.bind(this));
  }

  private onLine(str: string) {
    if (this.waitingCallback.length) {
      this.waitingCallback[0](str);
      this.waitingCallback = this.waitingCallback.slice(1);
      return;
    }
    this.buffer.push(str);
  }

  public async line(question?: string): Promise<string> {
    if (question) {
      // TODO:
      // I want to use `this.reader.write(question);` but return value contain 'question'
      console.log(question);
    }
    if (this.buffer.length) {
      const res = this.buffer[0];

      this.buffer = this.buffer.slice(1);
      return res;
    } else {
      const promise = new Promise<string>((resolve) => {
        const callbackOnLine = (str: string) => {
          resolve(str);
        };
        this.waitingCallback.push(callbackOnLine);
      });
      return promise;
    }
  }
}
