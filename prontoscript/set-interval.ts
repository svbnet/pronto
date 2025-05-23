/*!
  @title setInterval
  @version 1.0
  @author svbnet
 */

interface IntervalFunc {
  (): void;
  started: boolean;
}

const setInterval = (handler: () => void, interval: number): IntervalFunc => {
  const delayFunc = () => {
    handler();
    if (delayFunc.started) {
      Activity.scheduleAfter(interval, delayFunc, undefined);
    }
  };
  delayFunc.started = true;
  Activity.scheduleAfter(interval, delayFunc, undefined);
  return delayFunc;
};

const clearInterval = (func: IntervalFunc) => {
  func.started = false;
};
