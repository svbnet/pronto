interface HttpURI {
  host: string;
  port: number;
  relRequestURI: string;
  fragment: string;
}

interface URI {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
}

declare global {

  namespace com.philips.HttpLibrary {
    function getHTTP(url: string, callback: (data: string) => void): void;
    function getHTTPBinary(url: string, callback: (data: string) => void): void;
    function parseUri(uri: string): URI;
    function parseHttpUri(url: string): HttpURI;

    class HttpRequest {
      onconnect: () => void;
      onreadystatechange: () => void;
      readonly readyState: number;
      readonly responseBinary: string;
      readonly responseText: string;
      readonly status: number;
      readonly statusText: string;

      getAllResponseHeaders(): Record<string, string>;
      getResponseHeader(header: string): string | undefined;
      open(method: string, url: string, async: true): void;
      overrideMimeType(mimeType: string): void;
      send(body: string): void;
      sendChunk(chunk: string): void;
      setRequestHeader(header: string, value: string): void;
    }
  }
}

export { };
