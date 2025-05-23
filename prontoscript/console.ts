/*!
  @title Console
  @version 1.0
  @author svbnet
 */
class Console {
  private readonly printFunction: (message: string) => void;

  constructor(printFunction: (message: string) => void) {
    this.printFunction = printFunction;
  }

  private putMessage(level: string, content: string): void {
    this.printFunction(`${new Date()}: [${level}] ${content}`);
  }

  assert(condition: unknown, message: string): void {
    if (!condition) return;
    this.putMessage('assert', message);
  }

  error(message: string): void {
    this.putMessage('error', message);
  }

  info(message: string): void {
    this.putMessage('info', message);
  }

  warn(message: string): void {
    this.putMessage('warn', message);
  }

  log(message: string): void {
    this.putMessage('log', message);
  }
}

var console = new Console(System.print);
