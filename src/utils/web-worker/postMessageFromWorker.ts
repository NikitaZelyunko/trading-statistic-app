export type TMessageFromWorker<EN extends string, D> = {
  eventName: EN;
  data: D;
};
export function postMessageFromWorker<EN extends string, D>(eventName: EN, data: D) {
  const message: TMessageFromWorker<EN, D> = {
    eventName,
    data,
  };
  postMessage(message);
}
