declare global {
  class Input {
    onData: ((state: boolean) => void) | null;
    onError: ((e: Error) => void) | null;
    onTimeout: (() => void) | null;

    get(): boolean;
    match(state: boolean, timeout: number): boolean;
    wait(timeout: number): boolean;
  }

  class Relay {
    get(): boolean;
    set(state: boolean): void;
    toggle(): void;
  }

  class Serial {
    bitrate: number;
    databits: 7 | 8;
    onData: ((s: string) => void) | null;
    onError: ((e: Error) => void) | null;
    onTimeout: ((e: string) => void) | null;
    parity: 0 | 1 | 2;
    stopBits: 1 | 2;

    match(s: string | null | undefined, terminator: string, timeout: number): string;
    receive(s: string | null | undefined, count: number, timeout: number): string;
    send(s: string): void;
  }

  class Extender {
    readonly input: Input[];
    readonly relay: Relay[];
    readonly serial: Serial[];
  }

  class Image {
    readonly height: number;
    readonly width: number;

    constructor(s: string);
  }

  class Widget {
    bgcolor: number;
    bold: boolean;
    color: number;
    font: string;
    fontSize: number;
    halign: 'left' | 'center' | 'right';
    height: number;
    italic: boolean;
    label: string;
    left: number;
    onHold: (() => void) | null;
    onHoldInterval: number;
    onMove: ((x: number, y: number) => void) | null;
    onPress: ((x: number, y: number) => void) | null;
    onRelease: (() => void) | null;
    stretchImage: boolean;
    readonly tag: string;
    top: number;
    transparent: boolean;
    valign: 'top' | 'center' | 'bottom';
    visible: boolean;
    width: number;

    executeActions(): void;
    getBgColor(index?: number): number;
    getColor(index?: number): number;
    getImage(index?: number): Image;
    getLabelSize(text: string): [width: number, height: number];
    remove(): void;
    scheduleActions(): void;
    setBgColor(color: number, index?: number): void;
    setColor(color: number, index?: number): void;
    setImage(image: Image, index?: number): void;
  }

  class Page {
    readonly label: string;    
    onEntry: (() => void) | null;
    onExit: (() => void) | null;
    readonly tag: string;

    widget(tagW: string): Widget | null;
  }

  class Activity {
    label: string;
    readonly tag: string;
    onEntry: (() => void) | null;
    onExit: (() => void) | null;
    onRotary: ((clicks: number) => void) | null;
    onSleep: (() => void) | null;
    onWake: (() => void) | null;
    rotarySound: boolean;
    wifiEnabled: boolean;

    page(tagP?: string | null): Page | null;
    widget(tagW: string, tagP?: string | null): Widget | null;

    static scheduleAfter(duration: number, onAfter: (id: any) => void, id: any): void;
  }

  class GUI {
    static readonly height: number;
    static readonly width: number;
    static addButton(): Widget;
    static addPanel(): Widget;
    static alert(message: string): void;
    static getDisplayDate(): string;
    static getDisplayTime(): string;
    static updateScreen(): string;
    static widget(tagW: string): Widget | null;
  }

  class System {
    static addEventListener(type: 'battery' | 'netlink', listener: (event: string) => void): void;
    static delay(duration: number): void;
    static getGlobal(name: string): string | null;
    static getApplicationVersion(): string;
    static getBatteryStatus(): 'critical' | 'empty' | 'level1' | 'level2' | 'level3' | 'level4' | 'charging' | 'max';
    static getBootloaderVersion(): string;
    static getFreeCFMemory(): string;
    static getFirmwareVersion(): string;
    static getIRVersion(): string;
    static getModel(): string;
    static getNetlinkStatus(): 'disabled' | 'sleeping' | 'wifi-disconnected' | 'wifi-noip' | 'wifi-standalone' | 'wifi-level1' | 'wifi-level2' | 'wifi-level3' | 'wifi-level' | 'eth-disconnected' | 'eth-noip' | 'eth-ok';
    static getSerial(): string;
    static include(name: string): void;
    static print(s: string): void;
    static removeEventListener(type: 'battery' | 'netlink', listener: (event: string) => void): void;
    static reset(hard?: boolean): void;
    static setDebugMask(mask: number): void;
    static setGlobal(name: string, value?: string): void;
  }

  class TCPSocket {
    constructor(blocking?: boolean);

    readonly connected: boolean;
    onClose: () => void | null;
    onConnect: () => void | null;
    onData: () => void | null;
    onIOError: (e: Error) => void | null;

    static setSocketLimit(limit: number): void;

    connect(ip: string, port: number, timeout: number): void;
    close(): void;
    write(s: string): void;
    read(count: number, timeout?: number): string | undefined;
  }

  class CF {
    static readonly extender: Extender[];

    static activity(tagA?: string | null): Activity | null;
    static page(tagP?: string | null, tagA?: string | null): Page | null;
    static widget(tagW?: string | null, tagP?: string | null, tagA?: string | null): Widget | null;
  }
}

export { };
